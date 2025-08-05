import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivacyVault } from "../target/types/privacy_vault";

describe("privacy_vault", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.PrivacyVault as Program<PrivacyVault>;

  it("Is initialized!", async () => {
    const tx = await program.methods.initializeVault().rpc();
    console.log("Your transaction signature", tx);
  });
});
