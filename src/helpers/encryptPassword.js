const bcrypt = require('bcryptjs');
const ecrypt = {};

//Se encrypta la contraseña
ecrypt.encryptPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
};

//Verifica la contraseña ingresada la existente
ecrypt.matchPassword = async (password, savedPassword) => {
    try {
      return await bcrypt.compare(password, savedPassword);
    } catch (e) {
      console.log(e)
    }
  };
  
module.exports = ecrypt;