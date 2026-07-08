# Repositorio de Vídeo IA — by Goroka

Feed curado de referencias de vídeo hecho con IA, ordenado por fecha (lo último, arriba). Web estática: solo embeds de YouTube, sin backend.

Mantenido por **Aleix Perdigó** · ¿una referencia reciente que debería estar? → aleix.perdigo@goroka.tv

## Añadir un vídeo

Edita `videos.json` y añade una entrada al array `videos`:

```json
{
  "id": "identificador-unico",
  "youtubeId": "ID_DE_YOUTUBE",
  "title": "Título",
  "director": "Creador",
  "tool": "Veo",
  "date": "2026-06-01",
  "categories": ["Narrativa", "Fotorrealismo"],
  "highlight": "Dato destacado (opcional)",
  "description": "Ficha / créditos (opcional)",
  "source": "https://www.youtube.com/watch?v=ID_DE_YOUTUBE",
  "scifiFantasy": true
}
```

- `date` vacío (`""`) → la tarjeta muestra "FECHA S/D" y baja al final.
- `scifiFantasy: true` → se oculta al pulsar "Excluir Sci-fi / Fantasy".

## Local

```
python3 -m http.server 8132
```

## Analítica

GoatCounter (sin cookies) en `index.html`. Sustituye el subdominio en el `data-goatcounter` por el tuyo.
