import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';
import PrivacyVault from './components/PrivacyVault';

import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
    const network = WalletAdapterNetwork.Devnet;
    
    const endpoint = useMemo(() => {
        const rpcUrl = process.env.REACT_APP_RPC_URL;
        if (rpcUrl) {
            return rpcUrl;
        }
        return clusterApiUrl(network);
    }, [network]);
    
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                        <h1>Privacy-Preserving Vault</h1>
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                            <WalletMultiButton />
                            <WalletDisconnectButton />
                        </div>
                        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                            Connected to: {endpoint}
                        </div>
                        <PrivacyVault />
                    </div>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default App;
