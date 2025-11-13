// ===========================================================
//  REGISTRO DE CLIENTE – JS PRINCIPAL
// ===========================================================

// === Importar Firebase ===
import { 
  auth, 
  db, 
  storage 
} from "./firebase-config.js";

import { 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";


// ===========================================================
// ELEMENTOS DEL DOM
// ===========================================================
const form = document.getElementById("registroForm");
const nombreInput = document.getElementById("nombreInput");
const correoInput = document.getElementById("correoInput");
const telefonoInput = document.getElementById("telefonoInput");
const passInput = document.getElementById("passInput");
const passConfirmInput = document.getElementById("passConfirmInput");
const fotoInput = document.getElementById("fotoInput");
const avatarImg = document.getElementById("avatarImg");

// Avatar por defecto (inclúyelo en /imagenes/avatar_default.png)
const AVATAR_DEFAULT = "imagenes/avatar_default.png";

let fotoSeleccionada = null;


// ===========================================================
// PREVISUALIZAR FOTO
// ===========================================================
fotoInput.addEventListener("change", () => {
  const file = fotoInput.files[0];

  if (file) {
    fotoSeleccionada = file;
    avatarImg.src = URL.createObjectURL(file);
  }
});


// ===========================================================
// VALIDACIONES
// ===========================================================

// Solo letras y espacios — Nombre
function validarNombre(nombre) {
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(nombre.trim());
}

// Email válido
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Teléfono solo números (8–12 dígitos)
function validarTelefono(tel) {
  return /^[0-9]{8,12}$/.test(tel.trim());
}

// Contraseña sin espacios, mínimo 6
function validarPassword(pass) {
  return pass.length >= 6 && !/\s/.test(pass);
}

// Muestra error visual en el input
function marcarError(input, mensaje) {
  const grupo = input.parentElement;
  grupo.classList.add("error");
  mostrarSnackbar(mensaje);
}

// Limpia errores al escribir
[nombreInput, correoInput, telefonoInput, passInput, passConfirmInput].forEach(inp => {
  inp.addEventListener("input", () => {
    inp.parentElement.classList.remove("error");
  });
});


// ===========================================================
// FUNCIÓN PRINCIPAL — REGISTRO
// ===========================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = nombreInput.value.trim();
  const correo = correoInput.value.trim();
  const telefono = telefonoInput.value.trim();
  const pass = passInput.value;
  const confirmPass = passConfirmInput.value;

  // ------------------ VALIDACIONES ------------------

  if (!validarNombre(nombre)) {
    return marcarError(nombreInput, "Escribe un nombre válido.");
  }

  if (!validarEmail(correo)) {
    return marcarError(correoInput, "Correo inválido.");
  }

  if (!validarTelefono(telefono)) {
    return marcarError(telefonoInput, "Teléfono inválido.");
  }

  if (!validarPassword(pass)) {
    return marcarError(passInput, "La contraseña debe ser mínimo 6 caracteres y sin espacios.");
  }

  if (pass !== confirmPass) {
    return marcarError(passConfirmInput, "Las contraseñas no coinciden.");
  }

  // ------------------ CREAR CUENTA ------------------
  try {
    mostrarSnackbar("Creando cuenta...");

    const cred = await createUserWithEmailAndPassword(auth, correo, pass);
    const uid = cred.user.uid;

    let urlFoto = AVATAR_DEFAULT;

    // Si seleccionó una imagen → subir a Storage
    if (fotoSeleccionada) {
      const storageRef = ref(storage, `usuarios/${uid}/avatar.jpg`);
      await uploadBytes(storageRef, fotoSeleccionada);
      urlFoto = await getDownloadURL(storageRef);
    }

    // Datos del usuario a Firestore
    await setDoc(doc(db, "usuarios", uid), {
      uid,
      nombre,
      correo,
      telefono,
      foto: urlFoto,
      creadoEn: new Date().toISOString(),
      estado: "activo"
    });

    mostrarSnackbar("Cuenta creada con éxito ✨");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);

  } catch (error) {
    console.error("Error al registrar:", error);

    if (error.code === "auth/email-already-in-use") {
      mostrarSnackbar("Correo ya está registrado.");
    } else {
      mostrarSnackbar("Error al crear la cuenta.");
    }
  }
});
