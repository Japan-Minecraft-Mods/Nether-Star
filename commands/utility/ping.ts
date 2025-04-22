import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

// コマンド定義を追加
export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!');

// 実行処理を追加
export const execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const Latency = Math.round(interaction.client.ws.ping); // Botのレイテンシーを取得

    // modrinth APIのレイテンシーを取得
    const modrinthStart = Date.now();
    await fetch('https://api.modrinth.com/v2/'); 
    const API_Latency = Date.now() - modrinthStart;
    if (API_Latency < 0) return;
    await interaction.deferReply(); // 応答を遅延させる
    await interaction.editReply(`Pong! Botのレイテンシーは${Latency}ms, APIのレイテンシーは${API_Latency}ms`); // 応答を編集してPongを返す
};