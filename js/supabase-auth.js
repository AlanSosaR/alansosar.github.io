// ============================================================
// SUPABASE AUTH — MODO ADMIN API (A PRUEBA DE ERRORES 500)
// ============================================================

window.supabaseAuth = {

  // =====================================================================
  // 🚀 REGISTRAR USUARIO (FUNCIONA AÚN CUANDO signUp ESTÁ ROTO)
  // =====================================================================
  registerUser: async (email, password, phone, name, country) => {

    console.log("🔥 Creando usuario via Admin API...");

    // 1) Crear usuario DIRECTAMENTE en Auth
    const { data: userData, error: userError } =
      await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // NO confirmamos aquí, enviamos link después
        user_metadata: {
          full_name: name,
          phone,
          country,
          avatar_url: "https://alansosar.github.io/imagenes/avatar-default.svg"
        }
      });

    if (userError) {
      console.error("❌ Error creando usuario en Auth Admin:", userError);
      throw userError;
    }

    const user = userData.user;

    console.log("🟢 Usuario creado en Auth Admin:", user.id);

    // 2) Crear registro en tu tabla "users"
    const { error: dbError } = await supabaseClient
      .from("users")
      .insert({
        id: user.id,
        email,
        name,
        phone,
        country,
        photo_url: "https://alansosar.github.io/imagenes/avatar-default.svg",
        rol: "email",
        updated_at: new Date()
      });

    if (dbError) {
      console.error("❌ Error guardando usuario en DB:", dbError);
      throw dbError;
    }

    console.log("🟢 Usuario guardado en tabla 'users'");

    // 3) Enviar email de confirmación manualmente
    console.log("📨 Enviando correo de verificación...");

    const { error: emailError } =
      await supabaseClient.auth.admin.generateLink({
        type: "signup",
        email
      });

    if (emailError) {
      console.error("❌ Error enviando email de verificación:", emailError);
      throw emailError;
    }

    console.log("📬 Email de verificación enviado correctamente");

    return user;
  }

};
