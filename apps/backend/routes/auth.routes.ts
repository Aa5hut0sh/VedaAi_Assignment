import {Router} from 'express';

import { register,registerAdmin, login, logout, getCurrentUser } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const route = Router();

route.post("/register",register )
route.post("/register-admin", registerAdmin )
route.post("/login", login )
route.post("/logout", logout )
route.get("/me", authenticate, getCurrentUser)



export default route;
