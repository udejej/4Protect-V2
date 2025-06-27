const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

exports.help = {
  name: 'backup',
  sname: 'backup <save/load/list> [nom]',
  description: "Gère la backup.",
  use: 'backup <save/load/list> [nom]',
};

const backupDir = path.join(__dirname, '../../backups');

exports.run = async (bot, message, args, config) => {
  const checkperm = async (message, commandName) => {
    if (config.owners.includes(message.author.id)) {
      return true;
    }

const public = await new Promise((resolve, reject) => {
  db.get('SELECT statut FROM public WHERE guild = ? AND statut = ?', [message.guild.id, 'on'], (err, row) => {
    if (err) reject(err);
    resolve(!!row);
  });
});

if (public) {

  const publiccheck = await new Promise((resolve, reject) => {
    db.get(
      'SELECT command FROM cmdperm WHERE perm = ? AND command = ? AND guild = ?',
      ['public', commandName, message.guild.id],
      (err, row) => {
        if (err) reject(err);
        resolve(!!row);
      }
    );
  });

  if (publiccheck) {
    return true;
  }
}
    
    try {
      const userwl = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM whitelist WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (userwl) {
        return true;
      }

            const userowner = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM owner WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (userowner) {
        return true;
      }

      const userRoles = message.member.roles.cache.map(role => role.id);

      const permissions = await new Promise((resolve, reject) => {
        db.all('SELECT perm FROM permissions WHERE id IN (' + userRoles.map(() => '?').join(',') + ') AND guild = ?', [...userRoles, message.guild.id], (err, rows) => {
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

  if (!(await checkperm(message, exports.help.name))) {
    return message.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", allowedMentions: { repliedUser: false } });
  }

  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const action = args[0];
  const name = args[1] || `backup_${message.guild.id}`;

  if (action === 'save') {

    const data = {
      guild: {
        name: message.guild.name,
        icon: message.guild.iconURL(),
        channels: [],
        roles: [],
      }
    };

    message.guild.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => a.position - b.position)
      .forEach(role => {
        data.guild.roles.push({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions.bitfield.toString(),
          mentionable: role.mentionable,
        });
      });

    message.guild.channels.cache
      .sort((a, b) => a.position - b.position)
      .forEach(channel => {
        data.guild.channels.push({
          name: channel.name,
          type: channel.type,
          parent: channel.parentId,
          position: channel.position,
          topic: channel.topic || null,
          nsfw: channel.nsfw || false,
          rateLimitPerUser: channel.rateLimitPerUser || 0,
        });
      });

    fs.writeFileSync(path.join(backupDir, `${name}.json`), JSON.stringify(data, null, 2));
    return message.reply(`La backup **${name}** vient d'être sauvegardée.`);
  }

  if (action === 'list') {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    if (!files.length) return message.reply("Il y'a aucune backup.");
    return message.reply("Backups :\n" + files.map(f => `\`${f.replace('.json', '')}\``).join('\n'));
  }

  if (action === 'load') {
    const file = path.join(backupDir, `${name}.json`);
    if (!fs.existsSync(file)) return message.reply("Backup introuvable.");
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    for (const channel of message.guild.channels.cache.values()) {
      await channel.delete().catch(() => {});
    }
    for (const role of message.guild.roles.cache.values()) {
      if (role.id !== message.guild.id) await role.delete().catch(() => {});
    }

    for (const r of data.guild.roles) {
      await message.guild.roles.create({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: BigInt(r.permissions),
        mentionable: r.mentionable,
        reason: 'Backup',
      }).catch(() => {});
    }

    for (const c of data.guild.channels) {
      await message.guild.channels.create({
        name: c.name,
        type: c.type,
        parent: c.parent,
        position: c.position,
        topic: c.topic,
        nsfw: c.nsfw,
        rateLimitPerUser: c.rateLimitPerUser,
        reason: 'Backup',
      }).catch(() => {});
    }

    return message.reply(`La backup **${name}** a bien été chargée.`);
  }
};