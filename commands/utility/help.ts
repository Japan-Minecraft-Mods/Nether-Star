import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('利用可能なコマンド一覧を表示します')
    .addStringOption(option =>
        option
            .setName('command')
            .setDescription('詳細を知りたいコマンド名')
            .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

export const execute = async (interaction: ChatInputCommandInteraction) => {
    const commands = (interaction.client as any).commands; // Collection<string, Command>
    const name = interaction.options.getString('command');

    if (name) {
        const cmd = commands.get(name);
        if (!cmd) {
            return interaction.reply({ content: `コマンド \`${name}\` は存在しません。`, flags: MessageFlags.Ephemeral });
        }
        const embed = new EmbedBuilder()
            .setTitle(`Help: /${cmd.data.name}`)
            .setDescription(cmd.data.description)
            .addFields(
                ...(cmd.data.options?.map((opt: { name: any; description: any; }) => ({
                    name: opt.name,
                    value: opt.description,
                    inline: true,
                })) ?? [])
            );
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
        .setTitle('コマンド一覧')
        .setDescription('以下のコマンドが利用可能です。')
        .addFields(
            commands.map((cmd: { data: { name: any; description: any; }; }) => ({
                name: `/${cmd.data.name}`,
                value: cmd.data.description,
                inline: false,
            }))
        )
        .setFooter({ text: `Use /help <command> for details.` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
};