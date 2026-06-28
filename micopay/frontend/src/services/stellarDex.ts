import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Networks,
  Asset,
  Operation,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { exportSecretKey } from '../lib/keystore';

// CETES Stablebond — Etherfuse — Stellar Mainnet
const CETES_ISSUER = 'GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC';

// USDC on Stellar (Circle mainnet / SDF testnet)
const USDC_MAINNET = 'GA5ZSEJYB37JRC5AVECIA74KDKF7VKEHA6YOLE5JA4KKZNNY9EWCUQG6';
const USDC_TESTNET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const STELLAR_NETWORK = (import.meta.env.VITE_STELLAR_NETWORK as string) ?? 'TESTNET';
const IS_MAINNET = STELLAR_NETWORK === 'PUBLIC' || STELLAR_NETWORK === 'MAINNET';

const HORIZON_URL = IS_MAINNET
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

const NETWORK_PASSPHRASE = IS_MAINNET ? Networks.PUBLIC : Networks.TESTNET;

// 1% slippage tolerance
const SLIPPAGE = 0.01;

function getAsset(code: 'XLM' | 'USDC' | 'MXNe' | 'CETES'): Asset {
  if (code === 'XLM') return Asset.native();
  if (code === 'USDC') return new Asset('USDC', IS_MAINNET ? USDC_MAINNET : USDC_TESTNET);
  if (code === 'MXNe') return new Asset('MXNe', import.meta.env.VITE_MXNE_ISSUER_ADDRESS as string);
  return new Asset('CETES', CETES_ISSUER);
}

function hasTrustline(account: Horizon.AccountResponse, asset: Asset): boolean {
  if (asset.isNative()) return true;
  return account.balances.some(
    (b: any) => b.asset_code === asset.code && b.asset_issuer === asset.issuer,
  );
}

function extractError(e: unknown): string {
  const err = e as any;
  const ops = err?.response?.data?.extras?.result_codes?.operations as string[] | undefined;
  if (ops?.includes('op_no_path')) {
    return 'No hay liquidez disponible para esta operación en el DEX de Stellar.';
  }
  if (ops?.includes('op_underfunded')) {
    return 'Saldo insuficiente para completar la operación.';
  }
  if (ops?.includes('op_line_full')) {
    return 'El límite de confianza (trustline) está lleno.';
  }
  if (err instanceof Error) return err.message;
  return 'Error desconocido en la transacción Stellar.';
}

export interface DexSwapResult {
  hash: string;
  status: string;
  simulated: false;
  cetesReceived?: string;
  destReceived?: string;
  explorerUrl: string;
}

async function swapOnDex(
  sendAsset: Asset,
  sendAmount: string,
  destAsset: Asset,
): Promise<DexSwapResult> {
  const server = new Horizon.Server(HORIZON_URL);

  // Discover best DEX path before building the transaction
  const pathsPage = await server
    .strictSendPaths(sendAsset, sendAmount, [destAsset])
    .call();

  if (!pathsPage.records || pathsPage.records.length === 0) {
    throw new Error('No hay liquidez disponible para esta operación en el DEX de Stellar.');
  }

  const best = pathsPage.records[0];
  const destAmount: string = (best as any).destination_amount;
  const rawPath: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string }> =
    (best as any).path ?? [];
  const intermediatePath = rawPath.map((p) =>
    p.asset_type === 'native' ? Asset.native() : new Asset(p.asset_code!, p.asset_issuer!),
  );

  const destMin = (parseFloat(destAmount) * (1 - SLIPPAGE)).toFixed(7);

  const secretKey = await exportSecretKey();
  const kp = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(kp.publicKey());

  const txBuilder = new TransactionBuilder(account, {
    fee: (parseInt(BASE_FEE) * 10).toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Auto-add trustline for destination asset when missing
  if (!hasTrustline(account, destAsset)) {
    txBuilder.addOperation(Operation.changeTrust({ asset: destAsset }));
  }

  txBuilder.addOperation(
    Operation.pathPaymentStrictSend({
      sendAsset,
      sendAmount,
      destination: kp.publicKey(),
      destAsset,
      destMin,
      path: intermediatePath,
    }),
  );

  const tx = txBuilder.setTimeout(30).build();
  tx.sign(kp);

  const result = await server.submitTransaction(tx);
  const net = IS_MAINNET ? 'public' : 'testnet';

  return {
    hash: result.hash,
    status: 'success',
    simulated: false,
    ...(destAsset.code === 'CETES'
      ? { cetesReceived: destAmount }
      : { destReceived: destAmount }),
    explorerUrl: `https://stellar.expert/explorer/${net}/tx/${result.hash}`,
  };
}

export async function buyCETESOnDex(
  sendAmount: string,
  sendAssetCode: 'XLM' | 'USDC' | 'MXNe',
): Promise<DexSwapResult> {
  try {
    return await swapOnDex(getAsset(sendAssetCode), sendAmount, getAsset('CETES'));
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function sellCETESOnDex(
  cetesAmount: string,
  destAssetCode: 'XLM' | 'USDC' | 'MXNe',
): Promise<DexSwapResult> {
  try {
    return await swapOnDex(getAsset('CETES'), cetesAmount, getAsset(destAssetCode));
  } catch (e) {
    throw new Error(extractError(e));
  }
}
