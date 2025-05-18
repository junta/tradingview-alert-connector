import { AlertObject, OrderResult } from '../types';
import config from 'config';

interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    timestamp: string;
    footer?: {
        text: string;
    };
}

interface DiscordWebhookPayload {
    embeds: DiscordEmbed[];
}

export class DiscordWebhookService {
    private webhookUrl: string;

    constructor() {
        this.webhookUrl = config.get('discord.webhookUrl') || process.env.DISCORD_WEBHOOK_URL || '';
        
        if (!this.webhookUrl) {
            console.warn('Discord webhook URL not configured');
        }
    }

    async sendTradeAlert(
        alertMessage: AlertObject, 
        orderResult: OrderResult, 
        exchange: string
    ): Promise<void> {
        if (!this.webhookUrl) {
            console.log('Discord webhook not configured, skipping notification');
            return;
        }

        try {
            const embed = this.createTradeEmbed(alertMessage, orderResult, exchange);
            const payload: DiscordWebhookPayload = {
                embeds: [embed]
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Discord webhook failed with status: ${response.status}`);
            }

            console.log('Discord notification sent successfully');
        } catch (error) {
            console.error('Failed to send Discord notification:', error);
            // Don't throw - we don't want Discord failures to affect trading
        }
    }

    private createTradeEmbed(
        alertMessage: AlertObject, 
        orderResult: OrderResult, 
        exchange: string
    ): DiscordEmbed {
        // Determine color based on order side (green for buy, red for sell)
        const color = orderResult.side === 'BUY' ? 0x00ff00 : 0xff0000;
        
        // Format the order side for display
        const action = orderResult.side === 'BUY' ? '🟢 BUY' : '🔴 SELL';
        
        return {
            title: `${action} Order Executed`,
            color: color,
            fields: [
                {
                    name: '💱 Exchange',
                    value: exchange.toUpperCase(),
                    inline: true
                },
                {
                    name: '📈 Market',
                    value: alertMessage.market || 'N/A',
                    inline: true
                },
                {
                    name: '📊 Strategy',
                    value: alertMessage.strategy || 'N/A',
                    inline: true
                },
                {
                    name: '💰 Size',
                    value: orderResult.size?.toString() || 'N/A',
                    inline: true
                },
                {
                    name: '💲 TradingView Price',
                    value: `$${alertMessage.price || 'N/A'}`,
                    inline: true
                },
                {
                    name: '🆔 Order ID',
                    value: orderResult.orderId || 'N/A',
                    inline: true
                },
                {
                    name: '📍 Position',
                    value: alertMessage.position || 'N/A',
                    inline: true
                },
                {
                    name: '🔄 Reverse',
                    value: alertMessage.reverse ? 'Yes' : 'No',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Trading Bot Notification'
            }
        };
    }

    // Optional: Method for sending custom messages
    async sendCustomMessage(message: string): Promise<void> {
        if (!this.webhookUrl) {
            console.log('Discord webhook not configured, skipping notification');
            return;
        }

        try {
            const payload = {
                content: message
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Discord webhook failed with status: ${response.status}`);
            }

            console.log('Discord custom message sent successfully');
        } catch (error) {
            console.error('Failed to send Discord custom message:', error);
        }
    }
}