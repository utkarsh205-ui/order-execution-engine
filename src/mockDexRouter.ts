
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getBasePrice = () => {
  return 150 + (Math.random() - 0.5) * 10; 
};

const generateMockTxHash = () => {
  return 'Tx' + Array(62).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
};


class MockDexRouter {
  
  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number) {
    const basePrice = getBasePrice();
    await sleep(200 + Math.random() * 300);
    
    const price = basePrice * (0.98 + Math.random() * 0.04); 
    return {
      dex: 'Raydium',
      price: price,
      fee: 0.003,
      amountOut: amount * price * (1 - 0.003),
    };
  }

  async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number) {
    const basePrice = getBasePrice();
    await sleep(200 + Math.random() * 300); 
    
    const price = basePrice * (0.97 + Math.random() * 0.05);
    return {
      dex: 'Meteora',
      price: price,
      fee: 0.002,
      amountOut: amount * price * (1 - 0.002),
    };
  }

  async executeSwap(dex: string, order: any, executedPrice: number) {
    await sleep(2000 + Math.random() * 1000);

    console.log(`[MockDexRouter] Executing swap for order ${order.orderId} on ${dex}`);
    
    const finalPrice = executedPrice * (1 - (Math.random() * 0.005)); 

    return {
      txHash: generateMockTxHash(),
      executedPrice: finalPrice,
      amountOut: order.amountIn * finalPrice,
    };
  }
}

export const mockDexRouter = new MockDexRouter();