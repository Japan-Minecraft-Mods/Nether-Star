import { SlashCommandBuilder } from '@discordjs/builders';
import { searchMod, fetchModInfo } from '../../utils/modrinth_search';

// commands/utility/modinfo.ts
import {
    ChatInputCommandInteraction,
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
    interaction: ChatInputCommandInteraction<CacheType>
) {
    const slug = interaction.options.getString('slug', true);

    // ユーザーに一旦デファーを送信 (ephemeral にすると他の人には見えません)
    await interaction.deferReply({});

    try {
        // Modrinth で検索
        const mods = await searchMod(slug);
        if (!mods || mods.length === 0) {
            return interaction.editReply({ content: '指定されたModが見つかりませんでした。' });
        }

        // 最初の結果を使用
        const mod = mods[0];
        const info = await fetchModInfo(mod.id);

        const embed = new EmbedBuilder()
            .setTitle(info.modData.title ?? mod.title)
            .setURL(`https://modrinth.com/mod/${mod.slug}`)
            .setDescription(info.modData.description ?? '説明なし')
            .setThumbnail(info.modData.icon_url ?? null)
            .addFields(
                { name: 'ID', value: mod.id, inline: true },
                { name: 'バージョン範囲', value: info.versionRange ?? '不明', inline: true },
                { name: 'ダウンロード数', value: info.modData.downloads?.toString() ?? '不明', inline: true }
            )
            .setFooter({ text: 'Powered by Modrinth', iconURL: 'https://modrinth.com/favicon.ico' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (err) {
        console.error(err);
        await interaction.editReply({ content: '情報の取得中にエラーが発生しました。' });
    }
}

export default { data, execute };