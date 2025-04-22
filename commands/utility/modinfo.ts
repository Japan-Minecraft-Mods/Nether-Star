import { SlashCommandBuilder } from '@discordjs/builders';
import axios from 'axios';

// commands/utility/modinfo.ts
import {
    CommandInteraction,
    EmbedBuilder,
    CacheType,
    MessageFlags
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('modinfo')
    .setDescription('指定したModの情報を取得します')
    .addStringOption((option) =>
        option
            .setName('slug')
            .setDescription('ModのスラグまたはID')
            .setRequired(true)
    );

export async function execute(
    interaction: CommandInteraction<CacheType>
) {
    const slug = interaction.options.get('slug', true).value as string;
    await interaction.deferReply();

    try {
        // Modrinth API にリクエスト
        const res = await axios.get(
            `https://api.modrinth.com/v2/project/${encodeURIComponent(slug)}`
        );
        const mod = res.data;

        const embed = new EmbedBuilder()
            .setTitle(mod.title)
            .setURL(`https://modrinth.com/mod/${mod.slug}`)
            .setDescription(mod.description?.slice(0, 2048) || '説明なし')
            .addFields(
                { name: '作者', value: mod.author.join(', '), inline: true },
                {
                    name: 'ダウンロード数',
                    value: mod.downloads.toLocaleString(),
                    inline: true,
                },
                {
                    name: '最新バージョン',
                    value: mod.latest_version,
                    inline: true,
                }
            )
            .setThumbnail(mod.icon_url)
            .setFooter({ text: `ID: ${mod.project_id}` });

        await interaction.editReply({ embeds: [embed] });
    } catch (err) {
        console.error(err);
        await interaction.followUp({
            content: 'モッドが見つからないか、エラーが発生しました。',
            flags: MessageFlags.Ephemeral
        });
    }
}

export default { data, execute };