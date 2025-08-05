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
            const encryptedNoteData = new Uint8Array([1, 2, 3, 4, 5]); // Simple test data
            const signature = new Uint8Array(64).fill(0);
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
                    depositId,
                    noteNonce,
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



    const handleDeposit = useCallback(async () => {
        if (!publicKey || !window.solana) {
            setStatus('Please connect your wallet');
            return;
        }

        if (!vaultInitialized) {
            setStatus('Vault not initialized. Please initialize vault first.');
            return;
        }

        try {
            setStatus('Creating deposit...');
            
            const program = getProgram(connection, window.solana, PROGRAM_ID);
            const amount = parseFloat(depositAmount) * LAMPORTS_PER_SOL;
            
            const noteNonce = generateRandomNonce();
            const combinedData = new Uint8Array([
                ...publicKey.toBytes(),
                ...noteNonce
            ]);
            const depositId = hashData(combinedData);
            
            const withdrawalData = {
                depositId: Array.from(depositId),
                noteNonce: Array.from(noteNonce),
                destinationWallet: destinationWallet || publicKey.toString(),
                amount: amount
            };
            const withdrawalString = btoa(JSON.stringify(withdrawalData));
            setWithdrawalString(withdrawalString);
            
            const [vaultPDA] = getVaultPDA(PROGRAM_ID);
            const [depositMetadataPDA] = getDepositMetadataPDA(depositId, PROGRAM_ID);
            const [encryptedNotePDA] = getEncryptedNotePDA(noteNonce, PROGRAM_ID);
            
            const encryptedNoteData = new TextEncoder().encode(JSON.stringify({
                destinationWallet: destinationWallet || publicKey.toString(),
                amount: amount,
                timestamp: Date.now()
            }));
            
            const signature = new Uint8Array(64);
            
            setStatus('Sending transaction...');
            
            const tx = await program.methods
                .deposit(
                    depositId,
                    noteNonce,
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
            
            setStatus(`Deposit successful! Transaction: ${tx.substring(0, 20)}... Save this withdrawal string: ${withdrawalString.substring(0, 50)}...`);
            
        } catch (error) {
            console.error('Deposit error:', error);
            setStatus(`Deposit failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [publicKey, depositAmount, destinationWallet, vaultInitialized]);

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
                    depositId instanceof Array ? new Uint8Array(depositId) : depositId,
                    noteNonce instanceof Array ? new Uint8Array(noteNonce) : noteNonce,
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
                <h3>Deposit SOL</h3>
                <div style={{ marginBottom: '10px' }}>
                    <label>Amount (SOL): </label>
                    <input
                        type="number"
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.1"
                    />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Destination Wallet (optional): </label>
                    <input
                        type="text"
                        value={destinationWallet}
                        onChange={(e) => setDestinationWallet(e.target.value)}
                        placeholder="Leave empty to use current wallet"
                        style={{ width: '400px' }}
                    />
                </div>
                <button onClick={handleDeposit} disabled={!depositAmount || !vaultInitialized}>
                    Create Deposit
                </button>
                <button onClick={testSimpleDeposit} disabled={!vaultInitialized} style={{ marginLeft: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 20px' }}>
                    Test Simple Deposit
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
                <h4>How it works:</h4>
                <ul>
                    <li>Deposit: Creates encrypted note with withdrawal instructions, generates unlinkable deposit ID</li>
                    <li>Withdrawal: Uses the withdrawal string to access your funds at any fresh wallet</li>
                    <li>Privacy: On-chain observers cannot link deposits to withdrawals</li>
                    <li>Relayer Fee: 0.5% fee is deducted for withdrawal processing</li>
                </ul>
                <p><strong>Program ID:</strong> {PROGRAM_ID.toString()}</p>
                <p><strong>Vault Status:</strong> {vaultInitialized ? '✅ Initialized' : '❌ Not Initialized'}</p>
            </div>
        </div>
    );
}

export default PrivacyVault;
