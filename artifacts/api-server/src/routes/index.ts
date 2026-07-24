import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import accountsRouter from "./accounts";
import marketsRouter from "./markets";
import tradesRouter from "./trades";
import depositsRouter from "./deposits";
import notificationsRouter from "./notifications";
import settingsRouter from "./settings";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(accountsRouter);
router.use(marketsRouter);
router.use(tradesRouter);
router.use(depositsRouter);
router.use(notificationsRouter);
router.use(settingsRouter);
router.use(adminRouter);

export default router;
