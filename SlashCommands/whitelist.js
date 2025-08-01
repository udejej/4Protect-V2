const Discord = require('discord.js');
const db = require('../Events/loadDatabase');

module.exports = {
  name: 'whitelist',
  description: 'Permet de gérer la whitelist',
  dm_permission: false,
  options: [
    {
      type: Discord.ApplicationCommandOptionType.User,
      name: 'user',
      description: 'L\'utilisateur à ajouter',
      required: false,
    }
  ],
  run: async (bot, interaction, args, config) => {
  const configcheck = async (message, commandName) => {
    if (config.owners.includes(message.author.id)) {
      return true;
    }

const publicOn = await new Promise((resolve, reject) => {
  db.get('SELECT statut FROM public WHERE guild = ? AND statut = ?', [message.guild.id, 'on'], (err, row) => {
    if (err) reject(err);
    resolve(!!row);
  });
});

if (publicOn) {

  const publicCheck = await new Promise((resolve, reject) => {
    db.get(
      'SELECT command FROM cmdperm WHERE perm = ? AND command = ? AND guild = ?',
      ['public', commandName, message.guild.id],
      (err, row) => {
        if (err) reject(err);
        resolve(!!row);
      }
    );
  });

  if (publicCheck) {
    return true;
  }
}
    
    try {
      const wldb = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM whitelist WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (wldb) {
        return true;
      }

            const ownerdb = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM owner WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (ownerdb) {
        return true;
      }

      const roles = message.member.roles.cache.map(role => role.id);
      const permissions = await new Promise((resolve, reject) => {
        db.all('SELECT perm FROM permissions WHERE id IN (' + roles.map(() => '?').join(',') + ') AND guild = ?', [...roles, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.perm));
        });
      });

      if (permissions.length === 0) {
        return false;
      }

      const cmdwl = await new Promise((resolve, reject) => {
        db.all('SELECT command FROM cmdperm WHERE perm IN (' + permissions.map(() => '?').join(',') + ') AND guild = ?', [...permissions, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.command));
        });
      });

      return cmdwl.includes(commandName);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  };

  if (!(await configcheck(message, exports.help.name))) {
    const noacces = new EmbedBuilder()
    .setDescription("Vous n'avez pas la permission d'utiliser cette commande.")
    .setColor(config.color);
  return message.reply({embeds: [noacces], allowedMentions: { repliedUser: true }});
  }

    const user = interaction.options.getUser('user');

    if (!user) {
      db.all('SELECT id FROM whitelist', [], async (err, rows) => {
        if (err) {
          return;
        }

        const totalPages = Math.ceil(rows.length / 10);
        let currentPage = 1;

        const generateEmbed = async (page) => {
          const embed = new Discord.EmbedBuilder()
            .setTitle('Whitelist')
            .setColor(config.color)
            .setFooter({ text: `${rows.length} personnes - ${page}/${totalPages}` });

          const start = (page - 1) * ITEMS_PER_PAGE;
          const end = Math.min(start + ITEMS_PER_PAGE, rows.length);

          for (let i = start; i < end; i++) {
            const user = await bot.users.fetch(rows[i].id).catch(() => null);
            if (user) {
              embed.addFields({
                name: user.tag,
                value: user.id,
                inline: false
              });
            }
          }

          return embed;
        };

        const embed = await generateEmbed(currentPage);

        const row = new Discord.ActionRowBuilder()
          .addComponents(
            new Discord.ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Précédent')
              .setStyle('Primary')
              .setDisabled(currentPage === 1),
            new Discord.ButtonBuilder()
              .setCustomId('next')
              .setLabel('Suivant')
              .setStyle('Primary')
              .setDisabled(currentPage === totalPages)
          );

        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = i => i.user.id === interaction.user.id;
        const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async buttonInteraction => {
          if (buttonInteraction.customId === 'prev') {
            currentPage--;
          } else if (buttonInteraction.customId === 'next') {
            currentPage++;
          }

          const newEmbed = await generateEmbed(currentPage);

          const newRow = new Discord.ActionRowBuilder()
            .addComponents(
              new Discord.ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Précédent')
                .setStyle('Primary')
                .setDisabled(currentPage === 1),
              new Discord.ButtonBuilder()
                .setCustomId('next')
                .setLabel('Suivant')
                .setStyle('Primary')
                .setDisabled(currentPage === totalPages)
            );

          await buttonInteraction.update({ embeds: [newEmbed], components: [newRow] });
        });

        collector.on('end', collected => {
          if (collected.size === 0) {
            reply.edit({ components: [] });
          }
        });
      });
    } else {
      db.run(`INSERT OR IGNORE INTO whitelist (id) VALUES (?)`, [user.id], function(err) {
        if (err) {
          return;
        }
        interaction.reply(`${user.tag} a été ajouté à la whitelist.`);
      });
    }
  }
};
