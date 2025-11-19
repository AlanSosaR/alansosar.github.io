<input type="file" id="fileInput" accept="image/*" />
<button id="btnUpload">Subir imagen</button>

<script type="module">
import { supabase } from "./supabase-client.js";

document.getElementById("btnUpload").addEventListener("click", async () => {
  const archivo = document.getElementById("fileInput").files[0];

  if (!archivo) {
    alert("Selecciona un archivo primero.");
    return;
  }

  const nombreArchivo = `test-${Date.now()}.png`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(nombreArchivo, archivo, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error(error);
    alert("❌ ERROR subiendo: " + error.message);
  } else {
    alert("✅ Archivo subido con éxito:\n" + data.path);
  }
});
</script>
