"""
Payment Processor Tool

A tool for processing payments, handling refunds, and managing payment analytics
using Stripe API and other payment gateways.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import stripe
from decimal import Decimal

from .base import BaseTool

logger = logging.getLogger(__name__)

class PaymentProcessorTool(BaseTool):
    """
    Payment Processor Tool for handling payment operations.
    
    Features:
    - Process payments with Stripe
    - Handle refunds and disputes
    - Payment analytics and reporting
    - Subscription management
    - Payment method management
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.stripe_secret_key = config.get('stripe_secret_key', '')
        self.stripe_publishable_key = config.get('stripe_publishable_key', '')
        self.default_currency = config.get('default_currency', 'usd')
        
        # Initialize Stripe
        if self.stripe_secret_key:
            stripe.api_key = self.stripe_secret_key
        
    async def execute(self, operation: str, **kwargs) -> Dict[str, Any]:
        """
        Execute payment operation.
        
        Args:
            operation: Type of operation (charge, refund, etc.)
            **kwargs: Operation-specific parameters
            
        Returns:
            Operation result
        """
        if not operation:
            return self._format_error("Operation is required")
        
        try:
            if operation == "charge":
                return await self._process_charge(**kwargs)
            elif operation == "refund":
                return await self._process_refund(**kwargs)
            elif operation == "create_customer":
                return await self._create_customer(**kwargs)
            elif operation == "create_subscription":
                return await self._create_subscription(**kwargs)
            elif operation == "get_payment_intent":
                return await self._get_payment_intent(**kwargs)
            elif operation == "get_analytics":
                return await self._get_payment_analytics(**kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"Payment operation error: {str(e)}")
            return self._format_error(f"Payment operation failed: {str(e)}")
    
    async def _process_charge(self, amount: Union[int, float], currency: str = "usd",
                            payment_method: str = "card", customer_id: Optional[str] = None,
                            description: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process a payment charge."""
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            # Convert amount to cents for Stripe
            amount_cents = int(float(amount) * 100)
            
            # Prepare charge parameters
            charge_params = {
                'amount': amount_cents,
                'currency': currency.lower(),
                'payment_method_types': [payment_method],
                'description': description,
                'metadata': metadata or {}
            }
            
            if customer_id:
                charge_params['customer'] = customer_id
            
            # Create payment intent
            payment_intent = stripe.PaymentIntent.create(**charge_params)
            
            charge_data = {
                'payment_intent_id': payment_intent.id,
                'amount': amount,
                'amount_cents': amount_cents,
                'currency': currency,
                'status': payment_intent.status,
                'client_secret': payment_intent.client_secret,
                'customer_id': customer_id,
                'description': description,
                'created_at': datetime.fromtimestamp(payment_intent.created).isoformat()
            }
            
            metadata = {
                'operation': 'charge',
                'amount': amount,
                'currency': currency,
                'payment_method': payment_method
            }
            
            return self._format_success(charge_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Charge processing error: {str(e)}")
    
    async def _process_refund(self, payment_intent_id: str, amount: Optional[Union[int, float]] = None,
                            reason: str = "requested_by_customer") -> Dict[str, Any]:
        """Process a refund."""
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            # Get payment intent to check current amount
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if payment_intent.status != 'succeeded':
                return self._format_error("Payment intent is not in succeeded status")
            
            # Prepare refund parameters
            refund_params = {
                'payment_intent': payment_intent_id,
                'reason': reason
            }
            
            if amount:
                # Convert amount to cents
                amount_cents = int(float(amount) * 100)
                refund_params['amount'] = amount_cents
            
            # Create refund
            refund = stripe.Refund.create(**refund_params)
            
            refund_data = {
                'refund_id': refund.id,
                'payment_intent_id': payment_intent_id,
                'amount': amount if amount else payment_intent.amount / 100,
                'amount_cents': refund.amount,
                'currency': refund.currency,
                'status': refund.status,
                'reason': refund.reason,
                'created_at': datetime.fromtimestamp(refund.created).isoformat()
            }
            
            metadata = {
                'operation': 'refund',
                'payment_intent_id': payment_intent_id,
                'amount': amount,
                'reason': reason
            }
            
            return self._format_success(refund_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Refund processing error: {str(e)}")
    
    async def _create_customer(self, email: str, name: Optional[str] = None,
                             phone: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a new customer."""
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            # Prepare customer parameters
            customer_params = {
                'email': email,
                'metadata': metadata or {}
            }
            
            if name:
                customer_params['name'] = name
            
            if phone:
                customer_params['phone'] = phone
            
            # Create customer
            customer = stripe.Customer.create(**customer_params)
            
            customer_data = {
                'customer_id': customer.id,
                'email': customer.email,
                'name': customer.name,
                'phone': customer.phone,
                'created_at': datetime.fromtimestamp(customer.created).isoformat(),
                'livemode': customer.livemode
            }
            
            metadata = {
                'operation': 'create_customer',
                'email': email,
                'name': name
            }
            
            return self._format_success(customer_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Customer creation error: {str(e)}")
    
    async def _create_subscription(self, customer_id: str, price_id: str,
                                 payment_method: Optional[str] = None,
                                 metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a subscription for a customer."""
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            # Prepare subscription parameters
            subscription_params = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'metadata': metadata or {}
            }
            
            if payment_method:
                subscription_params['default_payment_method'] = payment_method
            
            # Create subscription
            subscription = stripe.Subscription.create(**subscription_params)
            
            subscription_data = {
                'subscription_id': subscription.id,
                'customer_id': customer_id,
                'price_id': price_id,
                'status': subscription.status,
                'current_period_start': datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                'current_period_end': datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                'created_at': datetime.fromtimestamp(subscription.created).isoformat(),
                'livemode': subscription.livemode
            }
            
            metadata = {
                'operation': 'create_subscription',
                'customer_id': customer_id,
                'price_id': price_id
            }
            
            return self._format_success(subscription_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Subscription creation error: {str(e)}")
    
    async def _get_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Get payment intent details."""
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            # Retrieve payment intent
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            intent_data = {
                'payment_intent_id': payment_intent.id,
                'amount': payment_intent.amount / 100,
                'amount_cents': payment_intent.amount,
                'currency': payment_intent.currency,
                'status': payment_intent.status,
                'customer_id': payment_intent.customer,
                'description': payment_intent.description,
                'metadata': payment_intent.metadata,
                'created_at': datetime.fromtimestamp(payment_intent.created).isoformat(),
                'livemode': payment_intent.livemode
            }
            
            metadata = {
                'operation': 'get_payment_intent',
                'payment_intent_id': payment_intent_id
            }
            
            return self._format_success(intent_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Payment intent retrieval error: {str(e)}")
    
    async def _get_payment_analytics(self, start_date: Optional[str] = None,
                                   end_date: Optional[str] = None,
                                   currency: str = "usd") -> Dict[str, Any]:
        """Get payment analytics and reporting."""
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            # Set default date range if not provided
            if not start_date:
                start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            if not end_date:
                end_date = datetime.utcnow().strftime('%Y-%m-%d')
            
            # Convert dates to timestamps
            start_timestamp = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp())
            end_timestamp = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp())
            
            # Get payment intents
            payment_intents = stripe.PaymentIntent.list(
                created={
                    'gte': start_timestamp,
                    'lte': end_timestamp
                },
                limit=100
            )
            
            # Calculate analytics
            total_charges = len(payment_intents.data)
            successful_charges = len([pi for pi in payment_intents.data if pi.status == 'succeeded'])
            failed_charges = len([pi for pi in payment_intents.data if pi.status == 'canceled'])
            
            total_amount = sum(pi.amount for pi in payment_intents.data if pi.status == 'succeeded')
            total_amount_decimal = total_amount / 100
            
            # Get refunds
            refunds = stripe.Refund.list(
                created={
                    'gte': start_timestamp,
                    'lte': end_timestamp
                },
                limit=100
            )
            
            total_refunds = len(refunds.data)
            total_refund_amount = sum(refund.amount for refund in refunds.data)
            total_refund_amount_decimal = total_refund_amount / 100
            
            analytics_data = {
                'period': {
                    'start_date': start_date,
                    'end_date': end_date
                },
                'charges': {
                    'total': total_charges,
                    'successful': successful_charges,
                    'failed': failed_charges,
                    'success_rate': round(successful_charges / total_charges * 100, 2) if total_charges > 0 else 0
                },
                'amounts': {
                    'total_charged': total_amount_decimal,
                    'total_charged_cents': total_amount,
                    'currency': currency,
                    'average_charge': round(total_amount_decimal / successful_charges, 2) if successful_charges > 0 else 0
                },
                'refunds': {
                    'total_refunds': total_refunds,
                    'total_refund_amount': total_refund_amount_decimal,
                    'total_refund_amount_cents': total_refund_amount,
                    'refund_rate': round(total_refund_amount / total_amount * 100, 2) if total_amount > 0 else 0
                }
            }
            
            metadata = {
                'operation': 'get_analytics',
                'start_date': start_date,
                'end_date': end_date,
                'currency': currency
            }
            
            return self._format_success(analytics_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Analytics error: {str(e)}")
    
    async def create_payment_method(self, type: str = "card", card_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a payment method.
        
        Args:
            type: Type of payment method (card, bank_account, etc.)
            card_data: Card details (for card payment methods)
            
        Returns:
            Payment method creation result
        """
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            if type == "card" and not card_data:
                return self._format_error("Card data is required for card payment methods")
            
            # Create payment method
            payment_method_params = {
                'type': type
            }
            
            if type == "card" and card_data:
                payment_method_params['card'] = card_data
            
            payment_method = stripe.PaymentMethod.create(**payment_method_params)
            
            payment_method_data = {
                'payment_method_id': payment_method.id,
                'type': payment_method.type,
                'created_at': datetime.fromtimestamp(payment_method.created).isoformat(),
                'livemode': payment_method.livemode
            }
            
            metadata = {
                'operation': 'create_payment_method',
                'type': type
            }
            
            return self._format_success(payment_method_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Payment method creation error: {str(e)}")
    
    async def attach_payment_method_to_customer(self, payment_method_id: str, customer_id: str) -> Dict[str, Any]:
        """
        Attach a payment method to a customer.
        
        Args:
            payment_method_id: Payment method ID
            customer_id: Customer ID
            
        Returns:
            Attachment result
        """
        try:
            if not self.stripe_secret_key:
                return self._format_error("Stripe secret key not configured")
            
            # Attach payment method to customer
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            attachment_data = {
                'payment_method_id': payment_method.id,
                'customer_id': customer_id,
                'attached': True,
                'created_at': datetime.fromtimestamp(payment_method.created).isoformat()
            }
            
            metadata = {
                'operation': 'attach_payment_method',
                'payment_method_id': payment_method_id,
                'customer_id': customer_id
            }
            
            return self._format_success(attachment_data, metadata)
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Payment method attachment error: {str(e)}")
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get information about this tool.
        
        Returns:
            Tool information dictionary
        """
        return {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'tool_type': self.tool_type,
            'capabilities': [
                'Process payment charges',
                'Handle refunds and disputes',
                'Create and manage customers',
                'Create and manage subscriptions',
                'Payment analytics and reporting',
                'Payment method management',
                'Secure payment processing'
            ],
            'supported_operations': [
                'charge',
                'refund',
                'create_customer',
                'create_subscription',
                'get_payment_intent',
                'get_analytics',
                'create_payment_method',
                'attach_payment_method_to_customer'
            ],
            'supported_currencies': ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'],
            'parameters': {
                'operation': 'Type of payment operation (required)',
                'amount': 'Payment amount (required for charge operations)',
                'currency': 'Payment currency (default: usd)',
                'payment_method': 'Payment method type (card, bank_account, etc.)',
                'customer_id': 'Customer ID for customer-specific operations',
                'description': 'Payment description'
            }
        } 