const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moddetails')
    .setDescription('ModrinthのMODの詳細を表示')
    .addStringOption(option => 
      option.setName('modid')
        .setDescription('MODのID')
        .setRequired(true)),

  async execute(interaction) {
    const modId = interaction.options.getString('modid');
    const apiUrl = `https://api.modrinth.com/v2/project/${modId}`;
    const authorUrl = `https://api.modrinth.com/v2/project/${modId}/members`;
    const versionsUrl = `https://api.modrinth.com/v2/project/${modId}/version`;
    const organizationUrl = `https://api.modrinth.com/v3/project/${modId}/organization`;

    try {
      // MOD情報の取得
      const response = await fetch(apiUrl);
      if (!response.ok) {
        return interaction.reply({ content: `エラー: APIからのレスポンスが無効です (ステータスコード: ${response.status})`, flags: MessageFlags.Ephemeral });
      }
      const data = await response.json();
      if (!data || !data.id) {
        return interaction.reply({ content: 'MODが見つかりませんでした。IDを確認してください。', flags: MessageFlags.Ephemeral });
      }

      // 最新バージョンの取得
      const versionsResponse = await fetch(versionsUrl);
      if (!versionsResponse.ok) {
        return interaction.reply({ content: `エラー: バージョン情報の取得に失敗しました (ステータスコード: ${versionsResponse.status})`, flags: MessageFlags.Ephemeral });
      }
      const versionsData = await versionsResponse.json();
      const latestVersion = versionsData.length > 0 ? versionsData[0].name : 'No versions available';

      // 作者名の取得
      const authorResponse = await fetch(authorUrl);
      if (!authorResponse.ok) {
        return interaction.reply({ content: `エラー: 作者情報の取得に失敗しました (ステータスコード: ${authorResponse.status})`, flags: MessageFlags.Ephemeral });
      }
      const authorData = await authorResponse.json();
      const member = authorData.find(member => member.role === 'Owner');
      const author = member ? member.user.username : (authorData.length > 0 ? authorData[0].user.username : 'Unknown');

      // Category を適切に表示
      const category = Array.isArray(data.categories) ? data.categories.join(', ') : (data.categories || 'No category');

      // Embedを作成
      const modEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(data.title || 'No title available')
        .setURL(`https://modrinth.com/mod/${data.id}`)
        .setThumbnail(data.icon_url || '')
        .addFields(
          { name: 'Author', value: author || 'Unknown', inline: true },
          { name: 'Category', value: category || 'No category', inline: true },
          { name: 'Latest Version', value: latestVersion || 'No versions available', inline: true },
          { name: 'Downloads', value: data.downloads ? data.downloads.toString() : '0', inline: true },
          { name: 'Description', value: data.description || 'No description available' } // Downloads の隣に配置
        )
        .setFooter({ text: 'Modrinth Mod Info' })
        .setTimestamp();

      return interaction.reply({ embeds: [modEmbed] });

    } catch (error) {
      console.error('エラー詳細:', error);
      return interaction.reply({ content: 'MOD情報の取得中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
    }
  },
};
