import type { FastifyInstance } from "fastify";
import {
  getCETESRate,
  formatCETESRate,
  calculateCETESPreview,
  type EtherfuseBondCost,
} from "../services/etherfuse.service.js";

const ETHERFUSE_API = process.env.ETHERFUSE_API_URL ?? "https://api.etherfuse.com";

export async function cetesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { amount?: string } }>(
    "/defi/cetes/rate",
    async (request, reply) => {
      const amount = request.query.amount ?? "100";

      try {
        const bondCost = await getCETESRate();
        const bondInfo = formatCETESRate(bondCost);

        return reply.send({
          apy: bondInfo.apy,
          xlmPerUsdc: 17.5,
          cetesIssuer: bondInfo.mint,
          cesPriceMxn: bondInfo.price_mxn,
          network: process.env.STELLAR_NETWORK ?? "TESTNET",
          note: "Live rates from Etherfuse API",
          source: "etherfuse",
          raw: bondCost,
        });
      } catch (error) {
        fastify.log.warn("Etherfuse API unavailable, using fallback rates");
        return reply.send({
          apy: 5.78,
          xlmPerUsdc: 17.5,
          cetesIssuer: "GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC",
          cesPriceMxn: 1.156,
          network: process.env.STELLAR_NETWORK ?? "TESTNET",
          note: "Fallback rates - Etherfuse API unavailable",
          source: "fallback",
        });
      }
    }
  );

  fastify.post<{
    Body: { amount: string; sourceAsset: "XLM" | "USDC" | "MXNe" };
  }>(
    "/defi/cetes/buy",
    async (request, reply) => {
      const { amount, sourceAsset } = request.body ?? {};

      if (!amount || !sourceAsset) {
        return reply.status(400).send({ error: "amount and sourceAsset required" });
      }

      try {
        const bondCost = await getCETESRate();
        const preview = calculateCETESPreview(parseFloat(amount), sourceAsset, bondCost);

        return reply.send({
          hash: `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          status: "pending",
          simulated: true,
          amount: amount,
          sourceAsset: sourceAsset,
          cetesReceived: preview.cetes.toString(),
          explorerUrl: `https://stellar.explorer.org/tx/${Date.now()}`,
          note: "Demo mode - connect to real Etherfuse SDK for live transactions",
        });
      } catch (error) {
        return reply.status(503).send({
          error: "Etherfuse API unavailable",
          message: "Unable to process CETES purchase at this time",
        });
      }
    }
  );

  fastify.post<{
    Body: { amount: string; destAsset: "XLM" | "USDC" | "MXNe" };
  }>(
    "/defi/cetes/sell",
    async (request, reply) => {
      const { amount, destAsset } = request.body ?? {};

      if (!amount || !destAsset) {
        return reply.status(400).send({ error: "amount and destAsset required" });
      }

      try {
        const bondCost = await getCETESRate();
        const cetesAmount = parseFloat(amount);
        const pricePerCetes = parseFloat(bondCost.bond_cost_in_fiat);
        const mxnReceived = cetesAmount * pricePerCetes;

        let destAmount: number;
        if (destAsset === "USDC") {
          destAmount = mxnReceived / bondCost.fiat_exchange_rate_with_usd;
        } else if (destAsset === "XLM") {
          const xlmPerUsdc = bondCost.fiat_exchange_rate_with_usd / parseFloat(bondCost.bond_cost_in_usd);
          destAmount = (mxnReceived / bondCost.fiat_exchange_rate_with_usd) * xlmPerUsdc;
        } else {
          destAmount = mxnReceived;
        }

        return reply.send({
          hash: `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          status: "pending",
          simulated: true,
          amount: amount,
          destAsset: destAsset,
          destReceived: destAmount.toFixed(6),
          explorerUrl: `https://stellar.explorer.org/tx/${Date.now()}`,
          note: "Demo mode - connect to real Etherfuse SDK for live transactions",
        });
      } catch (error) {
        return reply.status(503).send({
          error: "Etherfuse API unavailable",
          message: "Unable to process CETES sale at this time",
        });
      }
    }
  );
}
