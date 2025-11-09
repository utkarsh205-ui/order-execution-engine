import { Job } from 'bullmq';
import { type OrderJobData } from './queue.js';
import { connectionManager } from './connectionManager.js';
import { mockDexRouter } from './mockDexRouter.js';
import { saveConfirmedOrder, saveFailedOrder } from './db.js';
export const runOrderProcessor = async (job: Job<OrderJobData>) => {
  const { orderId, tokenIn, tokenOut, amountIn } = job.data;
  console.log(`[Worker] Processing order ${orderId}`);

  try {
    connectionManager.send(orderId, {
      orderId,
      status: 'routing',
      message: 'Comparing DEX prices...',
    });
    
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      mockDexRouter.getRaydiumQuote(tokenIn, tokenOut, amountIn),
      mockDexRouter.getMeteoraQuote(tokenIn, tokenOut, amountIn),
    ]);

    const bestQuote = raydiumQuote.amountOut > meteoraQuote.amountOut ? raydiumQuote : meteoraQuote;

    console.log(`[Order ${orderId}] Routing decision:
      - Raydium: ${raydiumQuote.amountOut.toFixed(6)} ${tokenOut}
      - Meteora: ${meteoraQuote.amountOut.toFixed(6)} ${tokenOut}
      - Chose: ${bestQuote.dex} [cite: 50]`);

    connectionManager.send(orderId, {
      orderId,
      status: 'building',
      message: `Best price found on ${bestQuote.dex}. Building transaction...`,
    });
    const executionResult = await mockDexRouter.executeSwap(
      bestQuote.dex,
      job.data,
      bestQuote.price
    );
    
    connectionManager.send(orderId, {
      orderId,
      status: 'submitted',
      message: `Transaction submitted to ${bestQuote.dex}. Waiting for confirmation...`,
      txHash: executionResult.txHash,
    });

    connectionManager.send(orderId, {
      orderId,
      status: 'confirmed',
      message: 'Transaction confirmed!',
      txHash: executionResult.txHash,
      executedPrice: executionResult.executedPrice,
      amountOut: executionResult.amountOut,
    });

    console.log(`[Order ${orderId}] Successfully confirmed.`);
    await saveConfirmedOrder(job.data, { ...executionResult, dex: bestQuote.dex });
    
    return executionResult;

  } catch (error: any) {
    console.error(`[Worker] FAILED order ${orderId}:`, error);

    connectionManager.send(orderId, {
      orderId,
      status: 'failed',
      message: 'An error occurred during execution.',
      error: error.message || 'Unknown error',
    });

    await saveFailedOrder(job.data, error);
    
    throw error;
  }
};