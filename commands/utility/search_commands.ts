import type { Client, Message, TextChannel } from 'discord.js'
import { Collection, EmbedBuilder, Colors } from 'discord.js'
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { searchMod } from '../../utils/modrinth_search';

interface Command {
    name: string
    description?: string
    usage?: string
    aliases?: string[]
    // 必要なら category など他のフィールドも
}

// Client に commands コレクションが載っている想定
declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>
    }
}

// コマンド定義を追加
export const data = new SlashCommandBuilder()
    .setName('search_mod')
    .setDescription('Modrinth で MOD を検索します')
    .addStringOption(option =>
        option
            .setName('query')
            .setDescription('検索ワード')
            .setRequired(true)
    );

// 実行処理を追加
export const execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply();
    const results = await searchMod(query);

    if (results.hits?.length) {
        const mod = results.hits[0];
        const embed = new EmbedBuilder()
            .setTitle(mod.title)
            .setURL(`https://modrinth.com/mod/${mod.id}`)
            .setDescription(mod.description ?? '概要なし');
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.editReply('結果が見つかりませんでした。');
    }
};

export async function searchCommands(
    client: Client,
    message: Message,
    args: string[]
): Promise<void> {
    const channel = message.channel as TextChannel;
    const query = args.join(' ').toLowerCase();
    const results = client.commands.filter(cmd =>
        cmd.name.toLowerCase().includes(query) ||
        (cmd.description?.toLowerCase().includes(query) ?? false)
    );

    if (results.size === 0) {
        await channel.send(`❌ 「${query}」に一致するコマンドは見つかりませんでした。`);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🔎 コマンド検索結果')
        .setColor(Colors.Blue)
        .setDescription(
            results
                .map(cmd => {
                    const aliasText = cmd.aliases?.length ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
                    const usageText = cmd.usage ? `\n使い方: \`${cmd.usage}\`` : '';
                    return `**${cmd.name}**${aliasText} - ${cmd.description ?? '説明なし'}${usageText}`;
                })
                .join('\n\n')
        );
    await channel.send({ embeds: [embed] });
}