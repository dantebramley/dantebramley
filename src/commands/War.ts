import { HTTPError, Util } from 'clashofclans.js';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { getLinkedClanTag } from '../database/clanData';

import type { ChatInputCommandInteraction } from 'discord.js';

const warStates: Record<string, string> = {
    preparation: 'Preparation day',
    inWar: 'Battle day',
    warEnded: 'War ended'
};

export const slashCommand = new SlashCommandBuilder()
    .setName('war')
    .setDescription('Get the info of a clan war')
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
        const war = await interaction.client.coc.getClanWar(clanTag);
        if (!war) {
            return await interaction.editReply({ content: `${clanTag} isn't in a war!` });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${war.clan.name}`)
            .setThumbnail(war.clan.badge.url)
            // I don't know what else to add in fields. You can find all the properties
            // available for war at - https://clashofclans.js.org/docs/api/classes/ClanWar
            .addFields(
                { name: 'Opponent Clan', value: `${war.opponent.name}`, inline: true },
                { name: 'War Size', value: `${war.teamSize}`, inline: false },
                { name: 'War State', value: warStates[war.state], inline: false }
            )
            .setColor([0xe7_4c_3c, 0x29_80_b9, 0x1a_bc_9c, 0xe6_7e_22, 0xf1_c4_0f][Math.floor(Math.random() * 6)])
            .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${war.clan.tag.replaceAll('#', '')}`)
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    } catch (error: unknown) {
        if (error instanceof HTTPError && error.message === 'notFound') {
            await interaction.editReply({ content: `$Failed to find clan with ${clanTag}!` });
        } else if (error instanceof HTTPError && error.reason === 'privateWarLog') {
            await interaction.editReply({ content: error.message });
        } else {
            console.error(error);
            await interaction.editReply({ content: 'Something went wrong, try again!' });
        }
    }
}
