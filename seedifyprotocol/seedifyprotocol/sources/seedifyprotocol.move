module seedifyprotocol::seedifyprotocol {
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::balance::{Self, Balance};
    use sui::event;

    

    // === Errors ===
    const EInvalidStartDate: u64 = 0;
    const EInvalidClaimTime: u64 = 1;
    const EInsufficientFunds: u64 = 2;
    const EInvalidPercentage: u64 = 3; // Error for invalid immediate transfer percentage
    const EAlreadyClaimed: u64 = 4; // Error when trying to renounce after already claiming
    const EClaimRenounced: u64 = 5; // Error when trying to claim after renouncement
    const ERenouncementPeriodOver: u64 = 6; // Error for attempting to renounce outside the allowed period
    const EUnauthorized: u64 = 7; // Error for unauthorized access
    const EClaimingPaused: u64 = 8; // New error for when claiming is paused
    


    // === Structs ===
   public struct Wallet<phantom T> has key, store {
    id: UID, // Unique ID for the wallet
    balance: Balance<T>, //// Store the vesting amount
    immediate_transfer_balance: Balance<T>, // Store the immediate transfer amount
    start: u64, // Start date of the vesting
    released: u64, // amount released
    duration: u64, // Duration of the vesting to be claimed
    claim_interval: u64, // Interval between claims
    last_claimed: u64, // Last claimed timestamp
    renouncement_start: u64, // Start date for renouncement
    renouncement_end: u64, // End date for renouncement
    claim_renounced: bool, // Track whether the claim has been renounced
    immediate_transfer_claimed: bool, // Track whether the immediate transfer has been claimed
    immediate_claim_start: u64,  // The start date when immediate transfer can be claimed
    is_claiming_paused: bool, // New field to track if claiming is paused     // The start date when the immediate transfer can be claimed
    admin: address,
}




    // === Struct to Store Admin Info ===
    // Declare the struct as public
    // admin_address field
    public struct Admin has key, store {
        id: UID,
        admin_address: address,
        
    }

    // Declare the event struct as public
    // Admin address transfer event
public struct TransferAdminCapEvent has copy, drop {
    previous_owner: address,
    new_owner: address,
}




    // === Public-Mutative Functions ===
    // new_admin function to create a new Admin object
    public fun new_admin(ctx: &mut TxContext): Admin {
        Admin {
            id: object::new(ctx),
            admin_address: tx_context::sender(ctx),
        }
    }

    //  authorizes a new admin
    public struct AdminCap has key, store {
    id: UID,
    admin_address: address,  // admin_address field
}


// Initialize the AdminCap object
fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap { // Create a new AdminCap object
        id: object::new(ctx), // Create a new object
        admin_address: tx_context::sender(ctx), // Set the admin address
    };
    transfer::public_transfer(admin_cap, tx_context::sender(ctx));  // Transfer the `AdminCap` to the deployer
}



// New function to create a new wallet 
// Alias entry_new to new
    public fun new<T>(
    token: &mut Coin<T>, // Token to be vested
    vesting_amount: u64, // Vesting amount
    immediate_transfer_amount: u64, // Immediate transfer amount
    immediate_claim_start: u64,     // The start date when immediate transfer can be claimed
    c: &Clock, // Clock reference for timestamp
    start: u64, // Start date of the vesting
    duration: u64, // Duration of the vesting
    claim_interval: u64, // Interval between claims
    renouncement_start: u64, // Start date for renouncement
    renouncement_end: u64, // End date for renouncement
    admin: address, // Admin address
    ctx: &mut TxContext // Transaction context whose sender is the admin
): Wallet<T> {
    assert!(start >= clock::timestamp_ms(c), EInvalidStartDate); // Ensure start date is in the future
    assert!(coin::value(token) >= vesting_amount + immediate_transfer_amount, EInsufficientFunds); // Ensure sufficient funds in the token
    
    let split_token = coin::split(token, vesting_amount, ctx); // Split the vesting amount
    let immediate_transfer_split = coin::split(token, immediate_transfer_amount, ctx); // Split the immediate transfer amount
    // Create a new Wallet object
    Wallet {
        id: object::new(ctx), // Create a new object
        balance: coin::into_balance(split_token), // Store in wallet
        is_claiming_paused: false, // Initialize claiming as not paused
        immediate_transfer_balance: coin::into_balance(immediate_transfer_split), // Store in wallet
        released: 0,
        start,
        duration,
        claim_interval,
        last_claimed: start,
        renouncement_start,
        renouncement_end,
        claim_renounced: false,
        immediate_transfer_claimed: false, // Initially not claimed
        immediate_claim_start, // Set the start date for immediate claim
        admin,
    }
}


// In entry_new, pass renouncement_start and renouncement_end to the new function


    entry fun entry_new<T>(
    admin_cap: &AdminCap,  // Add AdminCap parameter
    token: &mut Coin<T>,
    total_amount: u64,
    immediate_percentage: u64,
    immediate_claim_start: u64,
    c: &Clock,
    start: u64,
    duration: u64,
    claim_interval: u64,
    renouncement_start: u64,
    renouncement_end: u64,
    receiver: address,
    ctx: &mut TxContext
) {
    // Now only the holder of the `AdminCap` can call this function
    assert!(tx_context::sender(ctx) == admin_cap.admin_address, EUnauthorized);

    assert!(immediate_percentage <= 100, EInvalidPercentage); // Ensure the immediate percentage is valid and fits within 100%
    let immediate_amount = (total_amount * immediate_percentage) / 100;
    let vesting_amount = total_amount - immediate_amount;

    let wallet = new(
        token,
        vesting_amount,
        immediate_amount,
        immediate_claim_start,
        c,
        start,
        duration,
        claim_interval,
        renouncement_start,
        renouncement_end,
        tx_context::sender(ctx),  // Admin address
        ctx
    );
    transfer::public_transfer(wallet, receiver); // Transfer the wallet to the receiver
}


// New function to transfer the AdminCap
entry fun transfer_admin_cap( 
    mut admin_cap: AdminCap,  // existing AdminCap object
    new_owner: address, // New owner address
    ctx: &TxContext // Use immutable reference
) {
    // Update the admin_address in the AdminCap
    admin_cap.admin_address = new_owner;
    
    // Transfer the AdminCap object to the new owner
    transfer::public_transfer(admin_cap, new_owner);
    
    // Emit the event to log the transfer
    event::emit(TransferAdminCapEvent {
        previous_owner: tx_context::sender(ctx),
        new_owner,
    });
}




// status function to check the vesting status
    public fun vesting_status<T>(self: &Wallet<T>, c: &Clock): u64 {
        assert!(!self.claim_renounced, EClaimRenounced); // Prevent vesting status check if claim is renounced
        linear_vested_amount(
            self.start,
            self.duration,
            balance::value(&self.balance),
            self.released,
            clock::timestamp_ms(c)
        ) - self.released // Return the releasable amount to be claimed
    }

// New function to claim immediate transfer which is equivalent to TGE
    entry fun claim_immediate_transfer<T>(
    self: &mut Wallet<T>, // Wallet object
    c: &Clock, 
    ctx: &mut TxContext
) {
    assert!(!self.immediate_transfer_claimed, EAlreadyClaimed); // Ensure not already claimed
    assert!(clock::timestamp_ms(c) >= self.immediate_claim_start, EInvalidClaimTime); // Ensure the claim date is reached

    // Get the immediate transfer amount
    let immediate_transfer_value = balance::value(&self.immediate_transfer_balance); 
    // Create a coin from the immediate transfer balance
    let immediate_transfer_coin = coin::from_balance(balance::split(&mut self.immediate_transfer_balance, immediate_transfer_value), ctx);
    
    self.immediate_transfer_claimed = true; // Mark as claimed
    // Transfer the immediate transfer amount to the sender
    transfer::public_transfer(immediate_transfer_coin, tx_context::sender(ctx));
}


    // Function to claim the vested amount
    public fun claim<T>(self: &mut Wallet<T>, c: &Clock, ctx: &mut TxContext): Coin<T> {
        assert!(!self.claim_renounced, EClaimRenounced); // Prevent claiming if renounced
        assert!(!self.is_claiming_paused, EClaimingPaused); // Check if claiming is paused
        let current_time = clock::timestamp_ms(c);
        // Ensure the current time is greater than the last claimed time plus the claim interval
        assert!(current_time >= self.last_claimed + self.claim_interval, EInvalidClaimTime);

        let releasable = vesting_status(self, c); // Get the releasable amount
        assert!(releasable > 0, EInsufficientFunds); // Ensure releasable amount is positive
        self.released = self.released + releasable; // Update the released amount
        self.last_claimed = current_time; // Update the last claimed time

        // Create a coin from the releasable amount and transfer to the sender
        let claimed_coin = coin::from_balance(balance::split(&mut self.balance, releasable), ctx);
        assert!(coin::value(&claimed_coin) == releasable, EInsufficientFunds); // Ensure correct amount is claimed
        claimed_coin
    }


    // New function to claim the vested amount which is public alias of claim function
    entry fun entry_claim<T>(self: &mut Wallet<T>, c: &Clock, ctx: &mut TxContext) {
        let claimed_coin = claim(self, c, ctx);
        transfer::public_transfer(claimed_coin, tx_context::sender(ctx));
    }

    // New function to pause claiming
    public entry fun pause_claiming<T>(
        self: &mut Wallet<T>, // wallet object id of the wallet
        admin_cap: &AdminCap, // only admin can pause claiming
        ctx: &TxContext // transaction context to get the sender which is the admin
    ) {
        assert!(tx_context::sender(ctx) == admin_cap.admin_address, EUnauthorized);
        self.is_claiming_paused = true;
    }

    // New function to unpause claiming
    public entry fun unpause_claiming<T>(
        self: &mut Wallet<T>,
        admin_cap: &AdminCap, // only admin can unpause claiming
        ctx: &TxContext
    ) {

        // Ensure only the admin can unpause claiming
        assert!(tx_context::sender(ctx) == admin_cap.admin_address, EUnauthorized);
        self.is_claiming_paused = false;
    }

// New function to check if claiming is paused
    public fun is_claiming_paused<T>(self: &Wallet<T>): bool {
        self.is_claiming_paused
    }


// renounce_claim function to renounce the claim
  entry fun renounce_claim<T>(
    mut self: Wallet<T>,
    c: &Clock,              
    ctx: &mut TxContext
) {
    let current_time = clock::timestamp_ms(c); // Get the current time

    // Ensure the current time is within the renouncement period (error handling)
    assert!(current_time >= self.renouncement_start, 100);
    // Ensure the current time is within the renouncement period (error handling)
    assert!(current_time <= self.renouncement_end, 101);   
    
    // check for renouncement period
    assert!(current_time >= self.renouncement_start && current_time <= self.renouncement_end, ERenouncementPeriodOver);
    // Ensure the claim is not already renounced
    assert!(self.released == 0 && !self.immediate_transfer_claimed, EAlreadyClaimed);

    // Get the balance value of the wallet and create a coin from the balance
    let balance_value = balance::value(&self.balance);
    let immediate_transfer_value = balance::value(&self.immediate_transfer_balance);

    // Create a coin from the balance and immediate transfer balance
    let claimed_coin = coin::from_balance(balance::split(&mut self.balance, balance_value), ctx);
    let immediate_transfer_coin = coin::from_balance(balance::split(&mut self.immediate_transfer_balance, immediate_transfer_value), ctx);
    
    transfer::public_transfer(claimed_coin, self.admin); // Transfer the balance to the admin
    transfer::public_transfer(immediate_transfer_coin, self.admin); // Transfer the immediate transfer balance to the admin

    destroy_zero(self);
}


    // New function to check if the claim is renounced
    public fun is_claim_renounced<T>(self: &Wallet<T>): bool {
        self.claim_renounced
    }

    // destroy_zero function to delete the wallet object with zero balance
    public fun destroy_zero<T>(self: Wallet<T>) {
    let Wallet { id, balance, immediate_transfer_balance, .. } = self;
    object::delete(id); // Delete the wallet object
    balance::destroy_zero(balance); // Destroy the balance with zero value
    balance::destroy_zero(immediate_transfer_balance); // Destroy the immediate transfer balance with zero value
}

    // New public alias function to destroy the wallet object with zero balance
    entry fun entry_destroy_zero<T>(self: Wallet<T>) {
        destroy_zero(self); // Call the destroy_zero function
    }

    // === Public-View Functions ===
    public fun balance<T>(self: &Wallet<T>): u64 { // Function to get the balance
        balance::value(&self.balance)
    }

    public fun start<T>(self: &Wallet<T>): u64 { // Function to get the start date
        self.start
    }

    public fun released<T>(self: &Wallet<T>): u64 { // Function to get the released amount
        self.released
    }

    public fun duration<T>(self: &Wallet<T>): u64 { // Function to get the duration
        self.duration
    }

    public fun claim_interval<T>(self: &Wallet<T>): u64 { // Function to get the claim interval
        self.claim_interval
    }

    public fun last_claimed<T>(self: &Wallet<T>): u64 { // Function to get the last claimed timestamp
        self.last_claimed
    }

    // === Private Functions ===
    // Function to calculate the linear vested amount
    fun linear_vested_amount(start: u64, duration: u64, balance: u64, already_released: u64, timestamp: u64): u64 {
        // Call the linear_vesting_schedule function to get the vested amount
        linear_vesting_schedule(start, duration, balance + already_released, timestamp)
    }

    // Function to calculate the linear vesting schedule
    fun linear_vesting_schedule(start: u64, duration: u64, total: u64, timestamp: u64): u64 {
        if (timestamp < start) { // If the timestamp is before the start date
            0
        } else if (timestamp >= start + duration) { // If the timestamp is after the end date
            total
        } else { // If the timestamp is within the vesting period
            total * (timestamp - start) / duration // Calculate the vested amount
        }
    }
}
