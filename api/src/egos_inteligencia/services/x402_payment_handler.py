"""
InteLink x402 Payment Handler
Direct integration with Coinbase x402 protocol for pay-per-action validation.
Bypasses MCP, uses x402 client library directly.

Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any
from decimal import Decimal
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PaymentTier(str, Enum):
    """x402 payment tiers aligned with Sacred Math (F₃, F₅, F₈, F₁₃)"""
    FREE = "free"  # Health checks, metadata
    BASIC = "basic"  # F₃ = 0.0001 USDC
    PROCESSING = "processing"  # F₅ = 0.005 USDC
    ADVANCED = "advanced"  # F₈ = 0.008 USDC
    ENTERPRISE = "enterprise"  # F₁₃ = custom


class X402PaymentConfig:
    """Configuration for x402 payments on InteLink"""
    
    # Base chain configuration
    CHAIN_ID = 8453  # Base mainnet
    CHAIN_NAME = "base"
    CURRENCY = "USDC"
    USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # USDC on Base
    
    # InteLink payment recipient (your wallet)
    RECIPIENT_ADDRESS = os.getenv(
        "INTELINK_X402_RECIPIENT",
        "0x154E0e07B61aBd92fc6D574724E1AfE842854e45"  # Default from ETHIK API
    )
    
    # Facilitator (Coinbase CDP)
    FACILITATOR_URL = os.getenv(
        "X402_FACILITATOR_URL",
        "https://api.cdp.coinbase.com/v1/x402"
    )
    
    # Pricing tiers (in USDC)
    PRICING = {
        PaymentTier.FREE: Decimal("0.0000"),
        PaymentTier.BASIC: Decimal("0.0001"),  # F₃ / 1000
        PaymentTier.PROCESSING: Decimal("0.005"),  # F₅ / 1000
        PaymentTier.ADVANCED: Decimal("0.008"),  # F₈ / 1000
        PaymentTier.ENTERPRISE: Decimal("0.0"),  # Custom
    }
    
    # Sacred Math discount (φ = 1.618)
    PHI = 1.618
    PHI_DISCOUNT = 0.38  # 38% discount (1 - 1/φ)


class X402PaymentHandler:
    """
    Handles x402 payment verification and settlement for InteLink.
    
    Flow:
    1. Client requests protected endpoint
    2. Server responds 402 Payment Required with payment instructions
    3. Client prepares payment via x402 client library
    4. Client submits x-payment header with payment token
    5. Server verifies payment via facilitator /verify endpoint
    6. Server settles payment via facilitator /settle endpoint
    7. If valid, server processes request
    """
    
    def __init__(self, config: Optional[X402PaymentConfig] = None):
        self.config = config or X402PaymentConfig()
        self.logger = logger
    
    def get_payment_required_response(
        self,
        endpoint: str,
        tier: PaymentTier,
        description: str = ""
    ) -> Dict[str, Any]:
        """
        Generate 402 Payment Required response with payment instructions.
        
        Args:
            endpoint: API endpoint name (e.g., "/ingest")
            tier: Payment tier (FREE, BASIC, PROCESSING, ADVANCED, ENTERPRISE)
            description: Human-readable description of the action
        
        Returns:
            Dict with payment instructions for client
        """
        price = self.config.PRICING[tier]
        
        return {
            "error": "payment_required",
            "status_code": 402,
            "payment": {
                "price": str(price),
                "currency": self.config.CURRENCY,
                "chain": self.config.CHAIN_NAME,
                "chain_id": self.config.CHAIN_ID,
                "recipient": self.config.RECIPIENT_ADDRESS,
                "token_address": self.config.USDC_ADDRESS,
                "facilitator": self.config.FACILITATOR_URL,
                "endpoint": endpoint,
                "description": description or f"Payment for {endpoint}",
            },
            "instructions": {
                "step_1": "Prepare payment using @coinbase/x402 client library",
                "step_2": f"Send {price} {self.config.CURRENCY} to {self.config.RECIPIENT_ADDRESS}",
                "step_3": "Include x-payment header with payment token in retry request",
                "step_4": "Server verifies and settles payment via facilitator",
                "step_5": "If valid, server processes your request",
            },
            "example_client_code": """
import { X402Client } from '@coinbase/x402';
const client = new X402Client();
const payment = await client.preparePayment({
  amount: '%s',
  currency: 'USDC',
  chain: 'base',
  recipient: '%s'
});
const response = await fetch('%s', {
  method: 'POST',
  headers: { 'x-payment': payment.token },
  body: JSON.stringify(yourData)
});
""" % (str(price), self.config.RECIPIENT_ADDRESS, endpoint)
        }
    
    async def verify_payment(
        self,
        payment_token: str,
        expected_amount: Decimal,
        endpoint: str
    ) -> Dict[str, Any]:
        """
        Verify payment token via facilitator /verify endpoint.
        
        Args:
            payment_token: x-payment header value
            expected_amount: Expected payment amount in USDC
            endpoint: Endpoint being protected
        
        Returns:
            Dict with verification result (valid, tx_hash, amount, etc.)
        """
        # TODO: Implement actual facilitator call
        # For now, return mock response
        self.logger.info(f"Verifying payment for {endpoint}: {expected_amount} USDC")
        
        # In production, call:
        # POST {facilitator_url}/verify
        # Body: { payment_token, expected_amount, recipient, chain }
        
        return {
            "valid": True,
            "tx_hash": "0x" + "0" * 64,  # Mock
            "amount": str(expected_amount),
            "currency": self.config.CURRENCY,
            "chain": self.config.CHAIN_NAME,
            "timestamp": "2025-10-23T09:30:00Z",
        }
    
    async def settle_payment(
        self,
        payment_token: str,
        tx_hash: str
    ) -> Dict[str, Any]:
        """
        Settle payment via facilitator /settle endpoint.
        
        Args:
            payment_token: x-payment header value
            tx_hash: Transaction hash from verification
        
        Returns:
            Dict with settlement result
        """
        # TODO: Implement actual facilitator call
        self.logger.info(f"Settling payment: {tx_hash}")
        
        # In production, call:
        # POST {facilitator_url}/settle
        # Body: { payment_token, tx_hash }
        
        return {
            "settled": True,
            "tx_hash": tx_hash,
            "timestamp": "2025-10-23T09:30:01Z",
        }
    
    def apply_sacred_discount(
        self,
        price: Decimal,
        apply_discount: bool = False
    ) -> Decimal:
        """
        Apply Sacred Math φ discount (38% off).
        
        Args:
            price: Original price in USDC
            apply_discount: Whether to apply discount
        
        Returns:
            Discounted price (or original if no discount)
        """
        if not apply_discount:
            return price
        
        discount_amount = price * Decimal(str(self.config.PHI_DISCOUNT))
        return price - discount_amount
    
    def get_pricing_table(self) -> Dict[str, Dict[str, Any]]:
        """Get full pricing table for documentation"""
        return {
            tier.value: {
                "price_usdc": str(self.config.PRICING[tier]),
                "sacred_math": self._get_sacred_math_name(tier),
                "description": self._get_tier_description(tier),
                "with_discount": str(self.apply_sacred_discount(
                    self.config.PRICING[tier],
                    apply_discount=True
                )),
            }
            for tier in PaymentTier
        }
    
    @staticmethod
    def _get_sacred_math_name(tier: PaymentTier) -> str:
        """Map tier to Sacred Math constant"""
        mapping = {
            PaymentTier.FREE: "F₀ (free)",
            PaymentTier.BASIC: "F₃ (foundation)",
            PaymentTier.PROCESSING: "F₅ (integration)",
            PaymentTier.ADVANCED: "F₈ (scale)",
            PaymentTier.ENTERPRISE: "F₁₃ (enterprise)",
        }
        return mapping.get(tier, "unknown")
    
    @staticmethod
    def _get_tier_description(tier: PaymentTier) -> str:
        """Get tier description"""
        descriptions = {
            PaymentTier.FREE: "Health checks, metadata, public endpoints",
            PaymentTier.BASIC: "Simple queries, entity lookups",
            PaymentTier.PROCESSING: "Document ingest, semantic search",
            PaymentTier.ADVANCED: "Graph traversal, blockchain anchoring",
            PaymentTier.ENTERPRISE: "Custom SLA, private infrastructure",
        }
        return descriptions.get(tier, "")


# Singleton instance
_handler: Optional[X402PaymentHandler] = None


def get_x402_handler() -> X402PaymentHandler:
    """Get or create singleton X402PaymentHandler"""
    global _handler
    if _handler is None:
        _handler = X402PaymentHandler()
    return _handler
