const db = require('../../Events/loadDatabase');
const config = require('../../config.json');

exports.help = {
  name: 'setperm',
  sname: 'setperm [perms] [role]',  
  description: "Permet d'ajouter une permission à un rôle",
  use: 'setperm [perms] [role]',
};

exports.run = async (bot, message, args, config) => {
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

    
    if (!args[0] || !args[1]) {
      return
    }

    const permLevel = parseInt(args[0], 10);
    if (isNaN(permLevel) || permLevel < 1 || permLevel > 12) {
      return
    }

    const role = message.guild.roles.cache.get(args[1].replace(/[<@&>]/g, ''));
    if (!role) {
      return
    }

    db.get('SELECT * FROM permissions WHERE id = ? AND guild = ?', [role.id, message.guild.id], (err, row) => {
      if (err) {
        console.error("Erreur lors de la vérification des permissions dans la base de données :", err);
        return;
      }

      if (row) {
        return
      }

      db.run(`INSERT INTO permissions (perm, id, guild) VALUES (?, ?, ?)`,
        [permLevel, role.id, message.guild.id],
        (err) => {
          if (err) {
            console.error("Erreur lors de l'ajout du rôle dans la base de données :", err);
            return;
          }
          message.reply(`Le rôle \`${role.name}\` est maintenant lié à la permission \`${permLevel}\`.`);
        }
      );
    });
};
