#[test_only]
module seedifyprotocol::seedifyprotocol_tests {
    use sui::coin::{Coin, mint}; // Adjust imports as necessary
    use sui::clock::{Clock};
    use sui::tx_context::{TxContext, new_tx_context}; // Adjust imports as necessary
    use seedifyprotocol::seedifyprotocol::{new, entry_new, entry_claim, claim_immediate_transfer, vesting_status};

    const ENotImplemented: u64 = 0;

    #[test]
    fun test_new_wallet_creation() {
        // Proper initialization based on the framework capabilities
        let ctx = new_tx_context(); // Example: Replace with actual initialization or mock
        let clock = Clock { id: 0, timestamp_ms: 0 }; // Example: Replace with actual initialization
        let mut token: Coin<u64> = mint(1000, &ctx); // Example: Adjust according to the actual minting logic

        // Initialize the parameters
        let total_amount: u64 = 1000;
        let immediate_percentage: u64 = 20;
        let start: u64 = 0;
        let duration: u64 = 1000;
        let claim_interval: u64 = 100;
        let renouncement_start: u64 = 0;
        let renouncement_end: u64 = 1000;
        let immediate_claim_start: u64 = 0;

        // Call entry_new function
        entry_new(
            &mut token,
            total_amount,
            immediate_percentage,
            immediate_claim_start,
            &clock,
            start,
            duration,
            claim_interval,
            renouncement_start,
            renouncement_end,
            @0x1,  // receiver
            &mut ctx
        );
    }

    #[test]
    fun test_seedifyprotocol() {
        // pass
    }

    #[test, expected_failure(abort_code = ::seedifyprotocol::seedifyprotocol_tests::ENotImplemented)]
    fun test_seedifyprotocol_fail() {
        abort ENotImplemented
    }
}
