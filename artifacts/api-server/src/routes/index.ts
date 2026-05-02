import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flickscientRouter from "./flickscient";

const router: IRouter = Router();

router.use(healthRouter);
router.use(flickscientRouter);

export default router;
