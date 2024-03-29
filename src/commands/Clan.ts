import { HTTPError, Util } from 'clashofclans.js';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getLinkedClanTag } from '../database/clanData';

import type { ChatInputCommandInteraction } from 'discord.js';

export const slashCommand = new SlashCommandBuilder()
    .setName('clan')
    .setDescription('Get the info of a clan')
    .addStringOption((option) => option.setName('tag').setDescription('The clan tag'));

export async function execute(interaction: ChatInputCommandInteraction) {
    let clanTag = interaction.options.getString('tag');

    if (!clanTag) {
        const tag = await getLinkedClanTag(interaction);
        if (!tag) {
            return interaction.reply({
                content:
                    "You haven't linked a clan to your account! Either run `/link` command to link clan to your account or provide clan tag as second argument",
                ephemeral: true
            });
        }

        clanTag = tag;
    } else if (!Util.isValidTag(Util.formatTag(clanTag))) {
        return interaction.reply({ content: `${clanTag} isn't a valid clan tag!`, ephemeral: true });
    }

    try {
        await interaction.deferReply();
        const clan = await interaction.client.coc.getClan(clanTag);
        const embed = new EmbedBuilder()
            .setTitle(`${clan.name}`)
            .setThumbnail(clan.badge.url)
            // https://clashofclans.js.org/docs/api/classes/Clan
            .addFields(
                { name: 'Leader', value: clan.members.find((member) => member.role === 'leader')!.name, inline: true },
                { name: 'Description', value: `${clan.description}`, inline: false },
                { name: 'Members', value: `${clan.memberCount}`, inline: false },
                { name: 'Location', value: `${clan.location?.name ?? 'Not set'}`, inline: false },
                { name: 'Trophies', value: `${clan.points}`, inline: false },
                { name: 'Versus Trophies', value: `${clan.versusPoints}`, inline: false },
                { name: 'Clan War League', value: `${clan.warLeague?.name ?? 'No league'}`, inline: false },
                { name: 'Chat Language', value: `${clan.chatLanguage?.name ?? 'Not set'}`, inline: false }
            )
            .setColor([0xe7_4c_3c, 0x29_80_b9, 0x1a_bc_9c, 0xe6_7e_22, 0xf1_c4_0f][Math.floor(Math.random() * 6)])
            .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${clan.tag.replaceAll('#', '')}`)
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    } catch (error: unknown) {
        await (error instanceof HTTPError && error.message === 'notFound'
            ? interaction.editReply({ content: `$Failed to find clan with ${clanTag}!` })
            : interaction.editReply({ content: 'Something went wrong, try again!' }));
    }
}
