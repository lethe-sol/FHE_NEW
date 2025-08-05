import React, { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, Connection, SystemProgram } from '@solana/web3.js';
import { getProgram, getVaultPDA, getVaultConfigPDA, getDepositMetadataPDA, getEncryptedNotePDA } from '../utils/anchor-setup';

const PROGRAM_ID = new PublicKey('9RCJQa7HXgVv6L2RTSvAWw9hhh4DZRqRChHxpkdGQ553');
const connection = new Connection(process.env.REACT_APP_RPC_URL || 'https://api.devnet.solana.com');

const mockFHE = {
    generateKeypair: () => ({
        publicKey: new Uint8Array(32).fill(1),
        privateKey: new Uint8Array(32).fill(2)
    }),
    encrypt: (data: any, publicKey: Uint8Array) => {
        return new Uint8Array(256).fill(3); // Mock encrypted data
    },
    decrypt: (encryptedData: Uint8Array, privateKey: Uint8Array) => {
        return { destinationWallet: 'mock_wallet', amount: 1000000 };
    }
};

function PrivacyVault() {
    const { publicKey, signTransaction } = useWallet();
    const [depositAmount, setDepositAmount] = useState('');
    const [destinationWallet, setDestinationWallet] = useState('');
    const [withdrawalString, setWithdrawalString] = useState('');
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
            const accountInfo = await connection.getAccountInfo(vaultPDA);
            const isInitialized = !!accountInfo;
            setVaultInitialized(isInitialized);
            
            if (isInitialized) {
                setStatus(`Vault is initialized! PDA: ${vaultPDA.toString().substring(0, 20)}...`);
            } else {
                setStatus('Vault not found. Please initialize the vault first.');
            }
        } catch (error) {
            console.error('Error checking vault:', error);
            setVaultInitialized(false);
            setStatus(`Error checking vault: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey]);

    const initializeVault = useCallback(async () => {
        if (!publicKey || !window.solana) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Initializing vault...');
            
            const program = getProgram(connection, window.solana, PROGRAM_ID);
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
            setVaultInitialized(true);
            
        } catch (error) {
            console.error('Vault initialization error:', error);
            setStatus(`Vault initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey]);
    const testSimpleDeposit = useCallback(async () => {
        if (!publicKey || !window.solana) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Testing simple deposit with hardcoded values...');
            
            const program = getProgram(connection, window.solana, PROGRAM_ID);
            
            const depositId = new Uint8Array(32).fill(1);
            const noteNonce = new Uint8Array(32).fill(2);
            const encryptedNoteData = Array.from(new Uint8Array([1, 2, 3, 4, 5])); // Simple test data
            const signature = Array.from(new Uint8Array(64).fill(0));
            const amount = 100000000; // 0.1 SOL in lamports
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(depositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(noteNonce, PROGRAM_ID);
            
            console.log('Test values:', {
                depositId: depositId.length,
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
                    amount
                )
                .accounts({
                    deposit_metadata: depositMetadataPDA,
                    encrypted_note: encryptedNotePDA,
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
    }, [publicKey]);



    const handleSimpleDeposit = useCallback(async () => {
        if (!publicKey || !window.solana) {
            setStatus('Please connect your wallet');
            return;
        }

        if (!vaultInitialized) {
            setStatus('Vault not initialized. Please initialize vault first.');
            return;
        }

        try {
            setStatus('Creating simple 0.1 SOL deposit...');
            
            const program = getProgram(connection, window.solana, PROGRAM_ID);
            
            const amount = 100000000; // 0.1 SOL in lamports
            const destinationWallet = publicKey.toString(); // Same as depositor
            
            const noteNonce = generateRandomNonce();
            const combinedData = new Uint8Array([
                ...publicKey.toBytes(),
                ...noteNonce
            ]);
            const depositId = hashData(combinedData);
            
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
            
            const encryptedNoteData = Array.from(new TextEncoder().encode(JSON.stringify({
                destinationWallet: destinationWallet,
                amount: amount,
                timestamp: Date.now()
            })));
            
            const signature = Array.from(new Uint8Array(64));
            
            setStatus('Sending transaction...');
            
            const tx = await program.methods
                .deposit(
                    Array.from(depositId),
                    Array.from(noteNonce),
                    encryptedNoteData,
                    signature,
                    amount
                )
                .accounts({
                    deposit_metadata: depositMetadataPDA,
                    encrypted_note: encryptedNotePDA,
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
    }, [publicKey, vaultInitialized]);

    const handleWithdraw = useCallback(async () => {
        if (!publicKey || !window.solana) {
            setStatus('Please connect your wallet');
            return;
        }

        try {
            setStatus('Processing withdrawal...');
            
            const withdrawalData = JSON.parse(atob(withdrawalString));
            const { depositId, noteNonce, destinationWallet: destWallet, amount } = withdrawalData;
            
            const program = getProgram(connection, window.solana, PROGRAM_ID);
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(depositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(noteNonce, PROGRAM_ID);
            
            const destinationWalletPubkey = new PublicKey(destWallet);
            const relayerPubkey = publicKey;
            
            setStatus('Sending withdrawal transaction...');
            
            const tx = await program.methods
                .withdraw(
                    Array.isArray(depositId) ? depositId : Array.from(depositId),
                    Array.isArray(noteNonce) ? noteNonce : Array.from(noteNonce),
                    destinationWalletPubkey,
                    relayerPubkey
                )
                .accounts({
                    deposit_metadata: depositMetadataPDA,
                    encrypted_note: encryptedNotePDA,
                    vault: vaultPDA,
                    destination_wallet: destinationWalletPubkey,
                    relayer: relayerPubkey,
                    system_program: SystemProgram.programId,
                })
                .rpc();
            
            setStatus(`Withdrawal successful! Transaction: ${tx.substring(0, 20)}... Funds sent to ${destWallet.substring(0, 20)}...`);
            
        } catch (error) {
            console.error('Withdrawal error:', error);
            setStatus(`Withdrawal failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey, withdrawalString]);

    React.useEffect(() => {
        if (publicKey) {
            checkVaultInitialized();
        }
    }, [publicKey, checkVaultInitialized]);

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Privacy Vault Interface</h2>
            
            {publicKey && !vaultInitialized && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                    <h4>⚠️ Vault Not Initialized</h4>
                    <p>The vault needs to be initialized before deposits can be made.</p>
                    <button onClick={initializeVault} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Initialize Vault
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
                <button onClick={handleWithdraw} disabled={!withdrawalString}>
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
                <h4>Simple Testing Mode:</h4>
                <ul>
                    <li><strong>Amount:</strong> Fixed at 0.1 SOL for consistent testing</li>
                    <li><strong>Recipient:</strong> Same as depositor wallet (no complexity)</li>
                    <li><strong>Goal:</strong> Get basic deposit/withdrawal working first</li>
                    <li><strong>Next:</strong> Add FHE logic once transactions work</li>
                </ul>
                <p><strong>Program ID:</strong> {PROGRAM_ID.toString()}</p>
                <p><strong>Vault Status:</strong> {vaultInitialized ? '✅ Initialized' : '❌ Not Initialized'}</p>
            </div>
        </div>
    );
}

export default PrivacyVault;
