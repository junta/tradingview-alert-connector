import { AlertObject, OrderResult } from '../types';

export class DiscordWebhookService {
    private webhookUrl: string;

    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
    }

    async sendTradeAlert(
        alertMessage: AlertObject, 
        orderResult: OrderResult
    ): Promise<void> {
        // Do nothing if webhook URL is not configured
        if (!this.webhookUrl) {
            return;
        }

        try {
            const payload = {
                content: `Trade Executed:
Exchange: ${alertMessage.exchange}
Strategy: ${alertMessage.strategy}
Market: ${alertMessage.market}
Size USD: ${alertMessage.sizeUsd}
Order: ${alertMessage.order}
Position: ${alertMessage.position}
Price: ${alertMessage.price}
Reverse: ${alertMessage.reverse}
Environment: ${alertMessage.envProfile || 'N/A'}
Order ID: ${orderResult.orderId || 'N/A'}
Executed Size: ${orderResult.size || 'N/A'}
Executed Side: ${orderResult.side || 'N/A'}`
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`Discord webhook failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to send Discord notification:', error);
            // Silently fail - don't affect trading functionality
        }
    }

    async sendErrorAlert(
        alertMessage: AlertObject, 
        error: string
    ): Promise<void> {
        // Do nothing if webhook URL is not configured
        if (!this.webhookUrl) {
            return;
        }

        try {
            const payload = {
                content: `Trade Execution Failed:
Exchange: ${alertMessage.exchange}
Strategy: ${alertMessage.strategy}
Market: ${alertMessage.market}
Error: ${error}`
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`Discord webhook failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to send Discord error notification:', error);
        }
    }
}