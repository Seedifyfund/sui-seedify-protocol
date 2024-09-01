module seedifyprotocol::seedifyprotocol {
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::balance::{Self, Balance};
    

    // === Errors ===
    const EInvalidStartDate: u64 = 0;
    const EInvalidClaimTime: u64 = 1;
    const EInsufficientFunds: u64 = 2;
    const EInvalidPercentage: u64 = 3; // Error for invalid immediate transfer percentage
    const EAlreadyClaimed: u64 = 4; // Error when trying to renounce after already claiming
    const EClaimRenounced: u64 = 5; // Error when trying to claim after renouncement
    const ERenouncementPeriodOver: u64 = 6; // Error for attempting to renounce outside the allowed period


    // === Structs ===
   public struct Wallet<phantom T> has key, store {
    id: UID,
    balance: Balance<T>,
    immediate_transfer_balance: Balance<T>, // Store the immediate transfer amount
    start: u64,
    released: u64,
    duration: u64,
    claim_interval: u64,
    last_claimed: u64,
    renouncement_start: u64,
    renouncement_end: u64,
    claim_renounced: bool,
    immediate_transfer_claimed: bool, // Track whether the immediate transfer has been claimed
    immediate_claim_start: u64,       // The start date when the immediate transfer can be claimed
    admin: address,
}




    // === Struct to Store Admin Info ===
    public struct Admin has key, store {
        id: UID,
        admin_address: address,
    }

    // === Public-Mutative Functions ===
    public fun new_admin(ctx: &mut TxContext): Admin {
        Admin {
            id: object::new(ctx),
            admin_address: tx_context::sender(ctx),
        }
    }

    public fun new<T>(
    token: &mut Coin<T>,
    vesting_amount: u64,
    immediate_transfer_amount: u64, // Immediate transfer amount
    immediate_claim_start: u64,     // The start date when immediate transfer can be claimed
    c: &Clock,
    start: u64,
    duration: u64,
    claim_interval: u64,
    renouncement_start: u64,
    renouncement_end: u64,
    admin: address,
    ctx: &mut TxContext
): Wallet<T> {
    assert!(start >= clock::timestamp_ms(c), EInvalidStartDate);
    assert!(coin::value(token) >= vesting_amount + immediate_transfer_amount, EInsufficientFunds);
    
    let split_token = coin::split(token, vesting_amount, ctx);
    let immediate_transfer_split = coin::split(token, immediate_transfer_amount, ctx); // Split the immediate transfer amount
    
    Wallet {
        id: object::new(ctx),
        balance: coin::into_balance(split_token),
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
    token: &mut Coin<T>,
    total_amount: u64,
    immediate_percentage: u64,
    immediate_claim_start: u64, // Immediate claim start date
    c: &Clock,
    start: u64,
    duration: u64,
    claim_interval: u64,
    renouncement_start: u64,
    renouncement_end: u64,
    receiver: address,
    ctx: &mut TxContext
) {
    assert!(immediate_percentage <= 100, EInvalidPercentage);
    let immediate_amount = (total_amount * immediate_percentage) / 100;
    let vesting_amount = total_amount - immediate_amount;

    let wallet = new(
        token,
        vesting_amount,
        immediate_amount, // Pass the immediate transfer amount
        immediate_claim_start, // Pass the immediate claim start date
        c,
        start,
        duration,
        claim_interval,
        renouncement_start,
        renouncement_end,
        tx_context::sender(ctx), // Admin address
        ctx
    );
    transfer::public_transfer(wallet, receiver);
}



    public fun vesting_status<T>(self: &Wallet<T>, c: &Clock): u64 {
        assert!(!self.claim_renounced, EClaimRenounced); // Prevent vesting status check if claim is renounced
        linear_vested_amount(
            self.start,
            self.duration,
            balance::value(&self.balance),
            self.released,
            clock::timestamp_ms(c)
        ) - self.released
    }

    entry fun claim_immediate_transfer<T>(
    self: &mut Wallet<T>,
    c: &Clock,
    ctx: &mut TxContext
) {
    assert!(!self.immediate_transfer_claimed, EAlreadyClaimed); // Ensure not already claimed
    assert!(clock::timestamp_ms(c) >= self.immediate_claim_start, EInvalidClaimTime); // Ensure the claim date is reached

    let immediate_transfer_value = balance::value(&self.immediate_transfer_balance);
    let immediate_transfer_coin = coin::from_balance(balance::split(&mut self.immediate_transfer_balance, immediate_transfer_value), ctx);
    
    self.immediate_transfer_claimed = true; // Mark as claimed
    transfer::public_transfer(immediate_transfer_coin, tx_context::sender(ctx));
}



    public fun claim<T>(self: &mut Wallet<T>, c: &Clock, ctx: &mut TxContext): Coin<T> {
        assert!(!self.claim_renounced, EClaimRenounced); // Prevent claiming if renounced
        let current_time = clock::timestamp_ms(c);
        assert!(current_time >= self.last_claimed + self.claim_interval, EInvalidClaimTime);

        let releasable = vesting_status(self, c);
        assert!(releasable > 0, EInsufficientFunds); // Ensure releasable amount is positive
        self.released = self.released + releasable;
        self.last_claimed = current_time;

        let claimed_coin = coin::from_balance(balance::split(&mut self.balance, releasable), ctx);
        assert!(coin::value(&claimed_coin) == releasable, EInsufficientFunds); // Ensure correct amount is claimed
        claimed_coin
    }

    entry fun entry_claim<T>(self: &mut Wallet<T>, c: &Clock, ctx: &mut TxContext) {
        let claimed_coin = claim(self, c, ctx);
        transfer::public_transfer(claimed_coin, tx_context::sender(ctx));
    }

  entry fun renounce_claim<T>(
    mut self: Wallet<T>,
    c: &Clock,              
    ctx: &mut TxContext
) {
    let current_time = clock::timestamp_ms(c);

    assert!(current_time >= self.renouncement_start, 100);
    assert!(current_time <= self.renouncement_end, 101);   
    
    assert!(current_time >= self.renouncement_start && current_time <= self.renouncement_end, ERenouncementPeriodOver);
    assert!(self.released == 0 && !self.immediate_transfer_claimed, EAlreadyClaimed);
    
    let balance_value = balance::value(&self.balance);
    let immediate_transfer_value = balance::value(&self.immediate_transfer_balance);
    
    let claimed_coin = coin::from_balance(balance::split(&mut self.balance, balance_value), ctx);
    let immediate_transfer_coin = coin::from_balance(balance::split(&mut self.immediate_transfer_balance, immediate_transfer_value), ctx);
    
    transfer::public_transfer(claimed_coin, self.admin);
    transfer::public_transfer(immediate_transfer_coin, self.admin);

    destroy_zero(self);
}





    public fun is_claim_renounced<T>(self: &Wallet<T>): bool {
        self.claim_renounced
    }

    entry fun claim_after_renouncement<T>(
        self: &mut Wallet<T>,
        admin: &Admin,
        c: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(self.claim_renounced, EClaimRenounced); // Ensure claim is renounced
        let _current_time = clock::timestamp_ms(c);
        let remaining_balance = balance::value(&self.balance);
        let claimed_coin = coin::from_balance(balance::split(&mut self.balance, remaining_balance), ctx);
        transfer::public_transfer(claimed_coin, admin.admin_address);
    }

    public fun destroy_zero<T>(self: Wallet<T>) {
    let Wallet { id, balance, immediate_transfer_balance, .. } = self;
    object::delete(id);
    balance::destroy_zero(balance);
    balance::destroy_zero(immediate_transfer_balance);
}


    entry fun entry_destroy_zero<T>(self: Wallet<T>) {
        destroy_zero(self);
    }

    // === Public-View Functions ===
    public fun balance<T>(self: &Wallet<T>): u64 {
        balance::value(&self.balance)
    }

    public fun start<T>(self: &Wallet<T>): u64 {
        self.start
    }

    public fun released<T>(self: &Wallet<T>): u64 {
        self.released
    }

    public fun duration<T>(self: &Wallet<T>): u64 {
        self.duration
    }

    public fun claim_interval<T>(self: &Wallet<T>): u64 {
        self.claim_interval
    }

    public fun last_claimed<T>(self: &Wallet<T>): u64 {
        self.last_claimed
    }

    // === Private Functions ===
    fun linear_vested_amount(start: u64, duration: u64, balance: u64, already_released: u64, timestamp: u64): u64 {
        linear_vesting_schedule(start, duration, balance + already_released, timestamp)
    }

    fun linear_vesting_schedule(start: u64, duration: u64, total: u64, timestamp: u64): u64 {
        if (timestamp < start) {
            0
        } else if (timestamp >= start + duration) {
            total
        } else {
            total * (timestamp - start) / duration
        }
    }
}
