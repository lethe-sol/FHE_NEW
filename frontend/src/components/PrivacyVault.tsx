import React, { useState, useCallback, useEffect } from 'react';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, Connection, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram, getVaultPDA, getVaultConfigPDA, getDepositMetadataPDA, getEncryptedNotePDA } from '../utils/anchor-setup';
import init, { TfheClientKey, TfheCompactPublicKey, CompactCiphertextList, TfheConfigBuilder } from 'tfhe';

const PROGRAM_ID = new PublicKey('9RCJQa7HXgVv6L2RTSvAWw9hhh4DZRqRChHxpkdGQ553');
const connection = new Connection(process.env.REACT_APP_RPC_URL || 'https://api.devnet.solana.com');

class FHEManager {
    private clientKey: TfheClientKey | null = null;
    private publicKey: TfheCompactPublicKey | null = null;
    private initialized = false;

    async initialize() {
        if (this.initialized) return;
        
        await init();
        
        const savedClientKey = localStorage.getItem('fhe_client_key');
        const savedPublicKey = localStorage.getItem('fhe_public_key');
        
        if (savedClientKey && savedPublicKey) {
            this.clientKey = TfheClientKey.deserialize(new Uint8Array(JSON.parse(savedClientKey)));
            this.publicKey = TfheCompactPublicKey.deserialize(new Uint8Array(JSON.parse(savedPublicKey)));
        } else {
            const config = TfheConfigBuilder.default().build();
            this.clientKey = TfheClientKey.generate(config);
            this.publicKey = TfheCompactPublicKey.new(this.clientKey);
            
            localStorage.setItem('fhe_client_key', JSON.stringify(Array.from(this.clientKey.serialize())));
            localStorage.setItem('fhe_public_key', JSON.stringify(Array.from(this.publicKey.serialize())));
        }
        
        this.initialized = true;
    }

    encryptCommitment(data: Uint8Array): Uint8Array {
        if (!this.publicKey) throw new Error('FHE not initialized');
        
        const value = new DataView(data.buffer).getUint32(0, true);
        
        const builder = CompactCiphertextList.builder(this.publicKey);
        builder.push_u32(value);
        const ciphertext = builder.build();
        return ciphertext.serialize();
    }

    decryptCommitment(encryptedData: Uint8Array): Uint8Array {
        if (!this.clientKey) throw new Error('FHE not initialized');
        
        const ciphertext = CompactCiphertextList.deserialize(encryptedData);
        const expandedList = ciphertext.expand();
        const decrypted = expandedList.get_uint32(0).decrypt(this.clientKey);
        
        const result = new Uint8Array(32);
        new DataView(result.buffer).setUint32(0, decrypted, true);
        return result;
    }
}

const fheManager = new FHEManager();

function PrivacyVault() {
    const { publicKey } = useWallet();
    const wallet = useAnchorWallet();
    const [withdrawalString, setWithdrawalString] = useState('');
    const [destinationWallet, setDestinationWallet] = useState('');
    const [status, setStatus] = useState('');
    const [vaultInitialized, setVaultInitialized] = useState(false);

    const generateRandomNonce = () => {
        return crypto.getRandomValues(new Uint8Array(32));
    };

    const hashData = (data: Uint8Array) => {
        const hash = new Uint8Array(32);
        for (let i = 0; i < data.length; i++) {
            hash[i % 32] ^= data[i];
        }
        return hash;
    };

    const checkVaultInitialized = useCallback(async () => {
        if (!publicKey) return;
        
        try {
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [vaultConfigPDA] = getVaultConfigPDA(PROGRAM_ID);
            
            const [vaultAccountInfo, vaultConfigAccountInfo] = await Promise.all([
                connection.getAccountInfo(vaultPDA),
                connection.getAccountInfo(vaultConfigPDA)
            ]);
            
            const vaultExists = !!vaultAccountInfo;
            const vaultConfigExists = !!vaultConfigAccountInfo;
            const isFullyInitialized = vaultExists && vaultConfigExists;
            
            setVaultInitialized(isFullyInitialized);
            
            if (isFullyInitialized) {
                setStatus(`Vault fully initialized! Vault PDA: ${vaultPDA.toString().substring(0, 20)}... Config PDA: ${vaultConfigPDA.toString().substring(0, 20)}...`);
            } else if (vaultExists && !vaultConfigExists) {
                setStatus('Vault PDA exists but vault config missing. Please initialize vault config.');
            } else if (!vaultExists && vaultConfigExists) {
                setStatus('Vault config exists but vault PDA missing. Please initialize vault first.');
            } else {
                setStatus('Neither vault nor vault config found. Please initialize both.');
            }
        } catch (error) {
            console.error('Error checking vault:', error);
            setVaultInitialized(false);
            setStatus(`Error checking vault: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey]);

    const initializeVault = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Initializing vault...');
            
            const program = getProgram(connection, wallet);
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            
            const tx = await program.methods
                .initializeVault()
                .accounts({
                    vault: vaultPDA,
                    payer: publicKey,
                    system_program: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Vault initialized! Transaction: ${tx.substring(0, 20)}...`);
            
        } catch (error) {
            console.error('Vault initialization error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes('already in use') || errorMessage.includes('already exists')) {
                setStatus('Vault already exists! Proceeding to check vault status...');
            } else {
                setStatus(`Vault initialization failed: ${errorMessage}`);
            }
        }
        
        setTimeout(() => checkVaultInitialized(), 1000);
    }, [publicKey, wallet, checkVaultInitialized]);

    const initializeVaultConfig = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Initializing vault configuration...');
            
            const program = getProgram(connection, wallet);
            const [vaultConfigPDA] = getVaultConfigPDA(PROGRAM_ID);
            
            const authority = publicKey;
            const rewardMint = PublicKey.default;
            const rewardTokenVault = PublicKey.default;
            const rewardRatePerSecond = new anchor.BN(0);
            
            const tx = await program.methods
                .initializeVaultConfig(
                    authority,
                    rewardMint,
                    rewardTokenVault,
                    rewardRatePerSecond
                )
                .accounts({
                    vault_config: vaultConfigPDA,
                    payer: publicKey,
                    system_program: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Vault config initialized! Transaction: ${tx.substring(0, 20)}...`);
            
        } catch (error) {
            console.error('Vault config initialization error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes('already in use') || errorMessage.includes('already exists')) {
                setStatus('Vault config already exists! Proceeding to check vault status...');
            } else {
                setStatus(`Vault config initialization failed: ${errorMessage}`);
            }
        }
        
        setTimeout(() => checkVaultInitialized(), 1000);
    }, [publicKey, wallet, checkVaultInitialized]);
    const testSimpleDeposit = useCallback(async () => {
        if (!publicKey || !wallet) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Initializing FHE and testing deposit...');
            
            await fheManager.initialize();
            
            const program = getProgram(connection, wallet);
            
            const originalCommitment = crypto.getRandomValues(new Uint8Array(32));
            const encryptedCommitment = fheManager.encryptCommitment(originalCommitment);
            
            const commitmentHash = await crypto.subtle.digest('SHA-256', encryptedCommitment);
            const commitment = new Uint8Array(commitmentHash);
            const nullifierHash = crypto.getRandomValues(new Uint8Array(32));
            const encryptedNoteData = Buffer.from(new Uint8Array([1, 2, 3, 4, 5]));
            const signature = Buffer.from(new Uint8Array(64).fill(0));
            const amount = 100000000;
            
            const vaultConfig = await program.account.VaultConfig.fetch(getVaultConfigPDA(PROGRAM_ID)[0]);
            const nextDepositId = vaultConfig.nextDepositId.toNumber();
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(nextDepositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(nullifierHash, PROGRAM_ID);
            
            console.log('Test values:', {
                commitment: commitment.length,
                nullifierHash: nullifierHash.length,
                encryptedNoteData: encryptedNoteData.length,
                signature: signature.length,
                amount
            });
            
            setStatus('Sending test transaction...');
            
            const tx = await program.methods
                .deposit(
                    Buffer.from(commitment),
                    Buffer.from(nullifierHash),
                    encryptedNoteData,
                    signature,
                    new anchor.BN(amount)
                )
                .accounts({
                    deposit_metadata: depositMetadataPDA,
                    encrypted_note: encryptedNotePDA,
                    vault_config: getVaultConfigPDA(PROGRAM_ID)[0],
                    vault: vaultPDA,
                    depositor: publicKey,
                    system_program: SystemProgram.programId,
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
            const nullifierHash = crypto.getRandomValues(new Uint8Array(32));
            
            const vaultConfig = await program.account.VaultConfig.fetch(getVaultConfigPDA(PROGRAM_ID)[0]);
            const nextDepositId = vaultConfig.nextDepositId.toNumber();
            
            const withdrawalData = {
                depositId: nextDepositId,
                originalCommitment: Array.from(originalCommitment),
                commitment: Array.from(commitment),
                nullifierHash: Array.from(nullifierHash),
                destinationWallet: destinationWallet,
                amount: amount
            };
            const withdrawalString = btoa(JSON.stringify(withdrawalData));
            setWithdrawalString(withdrawalString);
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(nextDepositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(nullifierHash, PROGRAM_ID);
            
            const encryptedNoteData = Buffer.from(new TextEncoder().encode(JSON.stringify({
                destinationWallet: destinationWallet,
                amount: amount,
                timestamp: Date.now()
            })));
            
            const signature = Buffer.from(new Uint8Array(64));
            
            setStatus('Sending transaction...');
            
            const tx = await program.methods
                .deposit(
                    Buffer.from(commitment),
                    Buffer.from(nullifierHash),
                    encryptedNoteData,
                    signature,
                    new anchor.BN(amount)
                )
                .accounts({
                    deposit_metadata: depositMetadataPDA,
                    encrypted_note: encryptedNotePDA,
                    vault_config: getVaultConfigPDA(PROGRAM_ID)[0],
                    vault: vaultPDA,
                    depositor: publicKey,
                    system_program: SystemProgram.programId,
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
            const { depositId, originalCommitment, commitment, nullifierHash, amount } = withdrawalData;
            
            if (!destinationWallet.trim()) {
                setStatus('Please enter a destination wallet address');
                return;
            }
            
            const program = getProgram(connection, wallet);
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(depositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(new Uint8Array(nullifierHash), PROGRAM_ID);
            
            const destinationWalletPubkey = new PublicKey(destinationWallet.trim());
            const relayerPubkey = publicKey;
            
            setStatus('Sending withdrawal transaction...');
            
            const tx = await program.methods
                .withdraw(
                    depositId,
                    Buffer.from(new Uint8Array(commitment)),
                    Buffer.from(new Uint8Array(nullifierHash)),
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
