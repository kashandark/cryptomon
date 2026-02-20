import { http, createConfig } from 'wagmi';
import { mainnet, polygon, arbitrum } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum],
  connectors: [
    walletConnect({ 
      projectId: 'c03dcca235b62d1f74c20609771469c9', 
      showQrModal: true,
      metadata: {
        name: 'Crypto Monetizer Pro',
        description: 'Multi-exchange crypto asset detection and monetization',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: ['https://picsum.photos/200'],
      }
    }),
    coinbaseWallet({ 
      appName: 'Crypto Monetizer Pro',
      preference: 'all', 
    }),
    injected({
      target: 'metaMask',
      shimDisconnect: true,
    }),
    injected({
      target: 'trust',
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
});
