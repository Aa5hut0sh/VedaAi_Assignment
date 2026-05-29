import OpenAI from "openai";
import fs from "fs";
import path from "path";
import {pdfToText} from 'pdf-ts';
import Tesseract from "tesseract.js";


const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});


const extractTextFromMaterial = async (filePath: string): Promise<string | null> => {
  if (!fs.existsSync(filePath)) return null;

  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === ".pdf") {
      const fileBuffer = fs.readFileSync(filePath);
      const data = await pdfToText(fileBuffer);
      return data;
    } 
    else if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      console.log(`[Worker] Extracting text from image: ${filePath}`);
      const { data: { text } } = await Tesseract.recognize(filePath, "eng");
      return text;
    } 
    else {
    
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch (error) {
    console.error("Error extracting text from material:", error);
    return null;
  }
};

export const generateQuestionPaper = async (payload: {
  subject: string;
  className: string;
  timeAllowed: number;
  questionConfig: any[];
  additionalInstructions?: string;
  materialPath?: string | null;
}) => {
  
  let contextMaterial = "";
  if (payload.materialPath) {
    const extractedText = await extractTextFromMaterial(payload.materialPath);
    if (extractedText && extractedText.trim().length > 0) {
      contextMaterial = `\n\nUSE THE FOLLOWING MATERIAL AS CONTEXT FOR THE QUESTIONS:\n"""\n${extractedText}\n"""\n`;
    }
  }


  const configString = payload.questionConfig
    .map((q) => `- Generate ${q.count} ${q.questionType} worth ${q.marks} marks each.`)
    .join("\n");

  const totalExpectedMarks = payload.questionConfig.reduce(
    (acc: number, curr: any) => acc + curr.count * curr.marks,
    0
  );


  const systemPrompt = `
You are an expert academic teacher creating an exam paper. 
The target audience is Class: ${payload.className} for the Subject: ${payload.subject}.
Ensure the difficulty and vocabulary match this grade level.
Your task is to generate a structured exam based exactly on the requested configuration.

REQUIREMENTS:
1. Group similar question types into distinct 'sections' (e.g., Section A, Section B).
2. Assign a difficulty ('Easy', 'Moderate', or 'Challenging') to every question.
3. Provide the correct answer/answer key for EVERY question.
${payload.additionalInstructions ? `4. SPECIAL INSTRUCTIONS: ${payload.additionalInstructions}` : ""}

YOU MUST RESPOND ONLY WITH VALID JSON.
Ensure the totalMarks exactly equals ${totalExpectedMarks}.

EXPECTED JSON SCHEMA:
    {
    "totalMarks": Number,
    "sections": [
        {
        "title": "String",
        "instructions": "String",
        "questions": [
            {
            "text": "String",
            "difficulty": "Easy" | "Moderate" | "Challenging",
            "marks": Number,
            "answer": "String"
            }
        ]
        }
    ]
    }
  
EXAMPLE JSON OUTPUT:
    {
    "totalMarks": 20,
    "sections": [
        {
        "title": "Section A: Short Answer Questions",
        "instructions": "Attempt all questions. Each question carries 2 marks.",
        "questions": [
            {
            "text": "Define electroplating. Explain its purpose.",
            "difficulty": "Easy",
            "marks": 2,
            "answer": "Electroplating is the process of depositing a thin layer of metal on the surface of another metal using electric current. Its purpose is to prevent corrosion, improve appearance, or increase thickness."
            },
            {
            "text": "What is the role of a conductor in the process of electrolysis?",
            "difficulty": "Moderate",
            "marks": 2,
            "answer": "A conductor allows the flow of electric current, causing ions in the electrolyte to move and enabling chemical changes at electrodes."
            },
            {
            "text": "Why does a solution of copper sulfate conduct electricity?",
            "difficulty": "Easy",
            "marks": 2,
            "answer": "Copper sulfate solution contains free copper and sulfate ions which carry electric charge, thus conducting electricity."
            },
            {
            "text": "Describe one example of the chemical effect of electric current in daily life.",
            "difficulty": "Moderate",
            "marks": 2,
            "answer": "An example is the electroplating of silver on jewelry to prevent tarnishing."
            },
            {
            "text": "Explain why electric current is said to have chemical effects.",
            "difficulty": "Moderate",
            "marks": 2,
            "answer": "Electric current causes the movement of ions leading to chemical changes at the electrodes, hence it shows chemical effects."
            },
            {
            "text": "How is sodium hydroxide prepared during the electrolysis of brine? Write the chemical reaction involved.",
            "difficulty": "Challenging",
            "marks": 2,
            "answer": "Sodium hydroxide is formed at the cathode during brine electrolysis as water gains electrons: 2H2O + 2e- -> H2 + 2OH-. Na+ + OH- -> NaOH (in solution)"
            },
            {
            "text": "What happens at the cathode and anode during the electrolysis of water? Name the gases evolved.",
            "difficulty": "Challenging",
            "marks": 2,
            "answer": "At the cathode: water is reduced to hydrogen gas and hydroxide ions. At the anode: water is oxidized to oxygen gas and hydrogen ions."
            },
            {
            "text": "Mention the type of current used in electroplating and justify why it is used.",
            "difficulty": "Easy",
            "marks": 2,
            "answer": "Direct current (DC) is used because it provides a consistent, one-way flow of electrons, which is essential for the controlled deposition of metal."
            },
            {
            "text": "What is the importance of electric current in the field of metallurgy?",
            "difficulty": "Moderate",
            "marks": 2,
            "answer": "Electric current is used to extract highly reactive metals from their ores and to purify metals by electrorefining."
            },
            {
            "text": "Explain with a chemical equation how copper is deposited during the electroplating of an object.",
            "difficulty": "Challenging",
            "marks": 2,
            "answer": "In copper electroplating, copper ions in the solution gain electrons at the cathode and deposit as copper metal: Cu2+ + 2e- -> Cu."
            }
        ]
        }
    ]
    }
`;
  const safeContextMaterial = contextMaterial ? contextMaterial.slice(0, 14000) : "";

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b", 
      response_format: { type: "json_object" }, 
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the configuration for the test:\n${configString}${safeContextMaterial}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const aiOutput = response.choices[0]?.message?.content;

    if (!aiOutput) {
      throw new Error("AI returned empty response");
    }

    return JSON.parse(aiOutput);

  } catch (error: any) {
    console.error(" Groq Generation Error:", error);
    throw new Error(`Failed to generate paper: ${error.message}`);
  }
};