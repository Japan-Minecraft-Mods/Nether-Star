import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, CacheType } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot の応答時間を表示します'),
    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        // 一度仮返信してメッセージオブジェクトを取得
        await interaction.deferReply();
        const sent = await interaction.fetchReply() as any;

        const latency = (sent as any).createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        await interaction.editReply(
            `Pong! ボットの遅延: ${latency}ms, API 遅延: ${apiLatency}ms`
        );
    }
};