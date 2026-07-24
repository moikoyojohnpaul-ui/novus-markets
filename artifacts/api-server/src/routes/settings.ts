import { Router, type IRouter } from "express";
import { db, platformSettingsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/settings/platform", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  if (!settings) {
    res.json({
      depositFeeRate: 0.02,
      spreadMarkup: 0.0002,
      minDeposit: 10,
      maxLeverage: 500,
      demoBalance: 10000,
      cryptoWalletUsdt: "TRX7aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
      cryptoWalletBtc: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      mpesaPaybill: "123456",
    });
    return;
  }
  res.json({
    ...settings,
    depositFeeRate: parseFloat(settings.depositFeeRate.toString()),
    spreadMarkup: parseFloat(settings.spreadMarkup.toString()),
    minDeposit: parseFloat(settings.minDeposit.toString()),
    demoBalance: parseFloat(settings.demoBalance.toString()),
  });
});

export default router;
