# CDA-TKL på Render

Bygg med Dockerfile.render. Använd Frankfurt, Starter och en beständig disk på /data.
Den första starten visar bara en förberedelsesida tills befintliga driftdata och autentisering har återställts och /data/.restored skapats. Skapa aldrig en tom ersättare för en befintlig autentiseringsfil.

Gatewayen exponerar PORT (standard 10000); ställverk, simulator och LocoNet ligger på interna loopbackportar. Samma HTTPS-ursprung och inloggning skyddar båda webbgränssnitten. CHARLOTTENDAL_PUBLIC_ORIGIN styr den publika adressen och använder annars RENDER_EXTERNAL_URL.

Bevara state/, auth/ och migration-manifest.json på disken. Det gamla systemets miljöfil sparas separat som original-config/app.env för jämförelse. Render-variabler ska använda de nya sökvägarna, inte gamla /var/lib-sökvägar.

Installationen är avsedd för webbdrift med simulator, utan fysisk LocoBuffer.
