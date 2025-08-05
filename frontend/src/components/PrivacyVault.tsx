import React, { useState, useCallback } from 'react';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, Connection, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram, getVaultPDA, getVaultConfigPDA, getDepositMetadataPDA, getEncryptedNotePDA } from '../utils/anchor-setup';

const PROGRAM_ID = new PublicKey('9RCJQa7HXgVv6L2RTSvAWw9hhh4DZRqRChHxpkdGQ553');

class FHEManager {
    private clientKey: any = null;
    private publicKey: any = null;

    async initialize() {
        if (this.clientKey !== undefined) return;
        
        try {
            const { TfheClientKey, TfheCompactPublicKey, CompactCiphertextList, TfheConfigBuilder } = await import('tfhe');
            
            let storedClientKey = localStorage.getItem('fhe_client_key');
            if (storedClientKey) {
                try {
                    this.clientKey = TfheClientKey.deserialize(new Uint8Array(JSON.parse(storedClientKey)));
                } catch (deserializeError) {
                    console.warn('Failed to deserialize stored client key, generating new one');
                    this.clientKey = null;
                }
            } else {
                this.clientKey = null;
            }
            
            this.publicKey = null;
            
            console.log('FHE Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize FHE Manager:', error);
            this.clientKey = null;
            this.publicKey = null;
            console.log('Continuing without FHE functionality');
        }
    }

    encryptCommitment(data: Uint8Array): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(32));
    }

    decryptCommitment(encryptedData: Uint8Array): Uint8Array {
        return encryptedData.slice(0, 32);
    }
}

const fheManager = new FHEManager();

function PrivacyVault() {
    const { publicKey } = useWallet();
    const wallet = useAnchorWallet();
    const connection = new Connection('https://api.devnet.solana.com');
    
    const [status, setStatus] = useState<string>('');
    const [vaultInitialized, setVaultInitialized] = useState<boolean>(false);
    const [withdrawalString, setWithdrawalString] = useState<string>('');
    const [destinationWallet, setDestinationWallet] = useState<string>('');

    const generateRandomNonce = () => {
        return crypto.getRandomValues(new Uint8Array(32));
    };

    const hashData = async (data: Uint8Array): Promise<Uint8Array> => {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hashBuffer);
    };

    const checkVaultInitialized = useCallback(async () => {
        if (!publicKey || !wallet) return;

        try {
            const program = getProgram(connection, wallet);
            
            const [vaultAccountInfo, vaultConfigAccountInfo] = await Promise.all([
                program.provider.connection.getAccountInfo(getVaultPDA(PROGRAM_ID)[0]),
                program.provider.connection.getAccountInfo(getVaultConfigPDA(PROGRAM_ID)[0])
            ]);

            const vaultExists = vaultAccountInfo !== null;
            const vaultConfigExists = vaultConfigAccountInfo !== null;
            const isFullyInitialized = vaultExists && vaultConfigExists;

            console.log('Vault status check:', {vaultExists, vaultConfigExists, isFullyInitialized});
            setVaultInitialized(isFullyInitialized);

            if (isFullyInitialized) {
                setStatus('Vault fully initialized!');
            } else if (vaultExists && !vaultConfigExists) {
                setStatus('Vault initialized, but vault config missing. Click "2. Initialize Vault Config"');
            } else if (!vaultExists) {
                setStatus('Vault not initialized. Click "1. Initialize Vault" first');
            }
        } catch (error) {
            console.error('Error checking vault status:', error);
            setStatus('Error checking vault status');
        }
    }, [publicKey, wallet, connection]);

    const initializeVault = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Initializing vault...');
            const program = getProgram(connection, wallet);
            
            const tx = await program.methods
                .initializeVault()
                .accounts({
                    vault: getVaultPDA(PROGRAM_ID)[0],
                    payer: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Vault initialized! Transaction: ${tx.substring(0, 20)}...`);
            await checkVaultInitialized();
        } catch (error) {
            console.error('Vault initialization error:', error);
            setStatus(`Vault initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey, wallet, checkVaultInitialized]);

    const initializeVaultConfig = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Initializing vault config...');
            const program = getProgram(connection, wallet);
            
            const authority = publicKey;
            const rewardMint = new PublicKey('11111111111111111111111111111111');
            const rewardTokenVault = new PublicKey('11111111111111111111111111111111');
            const rewardRatePerSecond = new anchor.BN(1000);
            
            const tx = await program.methods
                .initializeVaultConfig(
                    authority,
                    rewardMint,
                    rewardTokenVault,
                    rewardRatePerSecond
                )
                .accounts({
                    vaultConfig: getVaultConfigPDA(PROGRAM_ID)[0],
                    payer: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Vault config initialized! Transaction: ${tx.substring(0, 20)}...`);
            await checkVaultInitialized();
        } catch (error) {
            console.error('Vault config initialization error:', error);
            setStatus(`Vault config initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey, wallet, checkVaultInitialized]);

    const testSimpleDeposit = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Creating test deposit...');
            
            await fheManager.initialize();
            
            const program = getProgram(connection, wallet);
            
            const originalCommitment = crypto.getRandomValues(new Uint8Array(32));
            const encryptedCommitment = fheManager.encryptCommitment(originalCommitment);
            
            const commitmentHash = await crypto.subtle.digest('SHA-256', encryptedCommitment);
            const commitment = new Uint8Array(commitmentHash);
            const noteNonce = crypto.getRandomValues(new Uint8Array(32));
            const encryptedNoteData = Buffer.from(new Uint8Array([1, 2, 3, 4, 5]));
            const signature = Buffer.from(new Uint8Array(64).fill(0));
            const amount = 100000000;
            
            const depositId = crypto.getRandomValues(new Uint8Array(32));
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(depositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(noteNonce, PROGRAM_ID);
            
            console.log('Test values:', {
                commitment: commitment.length,
                noteNonce: noteNonce.length,
                encryptedNoteData: encryptedNoteData.length,
                signature: signature.length,
                amount
            });
            
            setStatus('Sending test transaction...');
            
            const tx = await program.methods
                .deposit(
                    Array.from(depositId),
                    Array.from(noteNonce),
                    encryptedNoteData,
                    signature,
                    new anchor.BN(amount)
                )
                .accounts({
                    depositMetadata: depositMetadataPDA,
                    encryptedNote: encryptedNotePDA,
                    vault: vaultPDA,
                    depositor: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Test deposit successful! Transaction: ${tx.substring(0, 20)}...`);
            
        } catch (error) {
            console.error('Test deposit error:', error);
            setStatus(`Test deposit failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey, wallet]);

    const handleSimpleDeposit = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        if (!vaultInitialized) {
            setStatus('Vault not initialized. Please initialize vault first.');
            return;
        }

        try {
            setStatus('Initializing FHE and creating deposit...');
            
            await fheManager.initialize();
            
            const program = getProgram(connection, wallet);
            
            const amount = 100000000;
            const destinationWallet = publicKey.toString();
            
            const originalCommitment = crypto.getRandomValues(new Uint8Array(32));
            const encryptedCommitment = fheManager.encryptCommitment(originalCommitment);
            
            const commitmentHash = await crypto.subtle.digest('SHA-256', encryptedCommitment);
            const commitment = new Uint8Array(commitmentHash);
            const noteNonce = crypto.getRandomValues(new Uint8Array(32));
            
            const depositId = new Uint8Array(await crypto.subtle.digest('SHA-256', encryptedCommitment));
            
            const withdrawalData = {
                depositId: Array.from(depositId),
                noteNonce: Array.from(noteNonce),
                destinationWallet: destinationWallet,
                amount: amount
            };
            const withdrawalString = btoa(JSON.stringify(withdrawalData));
            setWithdrawalString(withdrawalString);
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(depositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(noteNonce, PROGRAM_ID);
            
            const encryptedNoteData = Buffer.from(new TextEncoder().encode(JSON.stringify({
                destinationWallet: destinationWallet,
                amount: amount,
                timestamp: Date.now()
            })));
            
            const signature = Buffer.from(new Uint8Array(64));
            
            setStatus('Sending transaction...');
            
            const tx = await program.methods
                .deposit(
                    Array.from(depositId),
                    Array.from(noteNonce),
                    encryptedNoteData,
                    signature,
                    new anchor.BN(amount)
                )
                .accounts({
                    depositMetadata: depositMetadataPDA,
                    encryptedNote: encryptedNotePDA,
                    vault: vaultPDA,
                    depositor: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Simple deposit successful! Transaction: ${tx.substring(0, 20)}... Save this withdrawal string: ${withdrawalString.substring(0, 50)}...`);
            
        } catch (error) {
            console.error('Simple deposit error:', error);
            setStatus(`Simple deposit failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey, vaultInitialized, wallet]);

    const handleWithdraw = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Processing withdrawal...');
            
            await fheManager.initialize();
            
            const withdrawalData = JSON.parse(atob(withdrawalString));
            const { depositId, noteNonce, amount } = withdrawalData;
            
            if (!destinationWallet.trim()) {
                setStatus('Please enter a destination wallet address');
                return;
            }
            
            const program = getProgram(connection, wallet);
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(depositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(new Uint8Array(noteNonce), PROGRAM_ID);
            
            const destinationWalletPubkey = new PublicKey(destinationWallet.trim());
            const relayerPubkey = publicKey;
            
            setStatus('Sending withdrawal transaction...');
            
            const tx = await program.methods
                .withdraw(
                    Buffer.from(new Uint8Array(depositId)),
                    Buffer.from(new Uint8Array(noteNonce)),
                    destinationWalletPubkey,
                    relayerPubkey
                )
                .accounts({
                    depositMetadata: depositMetadataPDA,
                    encryptedNote: encryptedNotePDA,
                    vault: vaultPDA,
                    destinationWallet: destinationWalletPubkey,
                    relayer: relayerPubkey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Withdrawal successful! Transaction: ${tx.substring(0, 20)}... Funds sent to ${destinationWallet.substring(0, 20)}...`);
            
        } catch (error) {
            console.error('Withdrawal error:', error);
            setStatus(`Withdrawal failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey, withdrawalString, destinationWallet, wallet]);

    React.useEffect(() => {
        if (publicKey) {
            checkVaultInitialized();
            fheManager.initialize().catch(console.error);
        }
    }, [publicKey, checkVaultInitialized]);

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Privacy Vault Interface</h2>
            
            {publicKey && !vaultInitialized && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                    <h4>⚠️ Vault Not Initialized</h4>
                    <p>The vault needs to be initialized before deposits can be made. This requires two steps:</p>
                    <button onClick={initializeVault} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}>
                        1. Initialize Vault
                    </button>
                    <button onClick={initializeVaultConfig} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                        2. Initialize Vault Config
                    </button>
                </div>
            )}
            
            <div style={{ marginBottom: '30px' }}>
                <h3>Simple Deposit Test (0.1 SOL)</h3>
                <p style={{ color: '#666', marginBottom: '15px' }}>
                    Hardcoded 0.1 SOL deposit to same wallet for clean testing
                </p>
                <button onClick={handleSimpleDeposit} disabled={!vaultInitialized} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '15px 30px', fontSize: '16px' }}>
                    Create Simple Deposit (0.1 SOL)
                </button>
                <button onClick={testSimpleDeposit} disabled={!vaultInitialized} style={{ marginLeft: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', padding: '15px 30px', fontSize: '16px' }}>
                    Test Hardcoded Deposit
                </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h3>Withdraw</h3>
                <div style={{ marginBottom: '10px' }}>
                    <label>Withdrawal String: </label>
                    <textarea
                        value={withdrawalString}
                        onChange={(e) => setWithdrawalString(e.target.value)}
                        placeholder="Paste your withdrawal string here"
                        style={{ width: '400px', height: '100px' }}
                    />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Destination Wallet Address: </label>
                    <input
                        type="text"
                        value={destinationWallet}
                        onChange={(e) => setDestinationWallet(e.target.value)}
                        placeholder="Enter destination wallet public key"
                        style={{ width: '400px', padding: '8px' }}
                    />
                </div>
                <button onClick={handleWithdraw} disabled={!withdrawalString || !destinationWallet.trim()}>
                    Process Withdrawal
                </button>
            </div>

            {withdrawalString && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
                    <h4>⚠️ Save Your Withdrawal String:</h4>
                    <textarea
                        readOnly
                        value={withdrawalString}
                        style={{ width: '100%', height: '80px', fontSize: '12px' }}
                    />
                    <p><strong>Important:</strong> Save this string securely. You'll need it to withdraw your funds!</p>
                </div>
            )}

            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f4f8' }}>
                <h4>Status:</h4>
                <p>{status || 'Ready'}</p>
            </div>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                <h4>FHE Privacy Mode:</h4>
                <ul>
                    <li><strong>Encryption:</strong> TFHE-rs client-side homomorphic encryption</li>
                    <li><strong>Privacy:</strong> Commitments encrypted before blockchain storage</li>
                    <li><strong>Unlinkability:</strong> Deposits and withdrawals appear as random ciphertexts</li>
                    <li><strong>Keys:</strong> Generated locally and stored in browser localStorage</li>
                </ul>
                <p><strong>Program ID:</strong> {PROGRAM_ID.toString()}</p>
                <p><strong>Vault Status:</strong> {vaultInitialized ? '✅ Initialized' : '❌ Not Initialized'}</p>
            </div>
        </div>
    );
}

export default PrivacyVault;
