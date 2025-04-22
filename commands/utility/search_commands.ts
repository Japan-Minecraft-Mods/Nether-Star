import type { Client, Message, TextChannel } from 'discord.js'
import { Collection, EmbedBuilder, Colors } from 'discord.js'

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