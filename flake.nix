{
  description = "Build & Connect web development environment and Worker package";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      perSystem =
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          node = pkgs.nodejs_26;
          source = pkgs.lib.cleanSourceWith {
            src = ./.;
            filter =
              path: _:
              let
                relative = pkgs.lib.removePrefix (toString ./. + "/") (toString path);
                top = builtins.head (pkgs.lib.splitString "/" relative);
              in
              builtins.elem top [
                "app"
                "components"
                "components.json"
                "public"
                "lib"
                "backend"
                "convex"
                "migrations"
                "tests"
                "scripts"
                "package.json"
                "bun.lock"
                "tsconfig.json"
                "vite.config.ts"
                "vitest.config.ts"
                "cloudflare.config.ts"
                "next.config.ts"
                "postcss.config.mjs"
                ".prettierrc.json"
                ".prettierignore"
              ];
          };
          bunCache = pkgs.stdenvNoCC.mkDerivation {
            pname = "buildandconnect-bun-cache";
            version = "0.1.0";
            src = pkgs.lib.fileset.toSource {
              root = ./.;
              fileset = pkgs.lib.fileset.unions [
                ./package.json
                ./bun.lock
              ];
            };
            nativeBuildInputs = [ pkgs.bun ];
            dontConfigure = true;
            dontFixup = true;
            buildPhase = ''
              export HOME="$TMPDIR/home"
              mkdir -p "$HOME" "$out"
              export BUN_INSTALL_CACHE_DIR="$out"
              # Cache every native variant; the offline install selects the host platform.
              bun install --frozen-lockfile --ignore-scripts --no-progress --cpu='*' --os='*' --libc='*'
              # Registry metadata varies with time and is not needed with a frozen lockfile.
              find "$out" -type f -name '*.npm' -delete
              # Bun's cache aliases must not embed the output's own Nix store path.
              while IFS= read -r -d "" link; do
                ln -sfnr "$(readlink "$link")" "$link"
              done < <(find "$out" -type l -lname "$out/*" -print0)
            '';
            dontInstall = true;
            outputHash = "sha256-/9RAGUDWwjVBorFlT49fwgtCFnO+T6NSZgnLfukOrV4=";
            outputHashAlgo = "sha256";
            outputHashMode = "recursive";
          };
          web = pkgs.stdenv.mkDerivation {
            pname = "buildandconnect";
            version = "0.1.0";
            src = source;
            SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
            nativeBuildInputs = [
              node
              pkgs.bun
              pkgs.makeWrapper
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ pkgs.autoPatchelfHook ];
            buildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ pkgs.stdenv.cc.cc.lib ];
            configurePhase = ''
              runHook preConfigure
              export HOME="$TMPDIR/home"
              mkdir -p "$HOME"
              cp -R ${bunCache} "$TMPDIR/bun-cache"
              chmod -R u+w "$TMPDIR/bun-cache"
              export BUN_INSTALL_CACHE_DIR="$TMPDIR/bun-cache"
              bun install --offline --frozen-lockfile --ignore-scripts --no-progress ${pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux "--libc=glibc"}
              ${pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
                # Some optional packages omit libc metadata; these targets use glibc.
                rm -rf node_modules/lightningcss-linux-*-musl \
                  node_modules/@img/sharp-linuxmusl-* \
                  node_modules/@img/sharp-libvips-linuxmusl-* \
                  node_modules/@rolldown/binding-linux-*-musl \
                  node_modules/@tailwindcss/oxide-linux-*-musl
              ''}
              patchShebangs node_modules
              ${pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux "autoPatchelf node_modules"}
              runHook postConfigure
            '';
            postInstall = pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
              autoPatchelf "$out"
            '';
            buildPhase = ''
              runHook preBuild
              export CI=true
              export CLOUDFLARE_SEND_METRICS=false
              bun run build
              runHook postBuild
            '';
            doCheck = true;
            checkPhase = ''
              runHook preCheck
              bun run typecheck
              bun run test
              runHook postCheck
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p "$out/share/buildandconnect" "$out/bin"
              cp -r node_modules package.json vite.config.ts cloudflare.config.ts \
                next.config.ts tsconfig.json "$out/share/buildandconnect/"
              mkdir "$out/share/buildandconnect/.cloudflare"
              cp -r .cloudflare/output "$out/share/buildandconnect/.cloudflare/"
              cp scripts/preview-built.sh "$out/share/buildandconnect/preview.sh"
              makeWrapper ${pkgs.bash}/bin/bash "$out/bin/buildandconnect" \
                --add-flags "$out/share/buildandconnect/preview.sh" \
                --prefix PATH : ${
                  pkgs.lib.makeBinPath [
                    node
                    pkgs.coreutils
                  ]
                } \
                --set CLOUDFLARE_SEND_METRICS false \
                --set SSL_CERT_FILE ${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
              runHook postInstall
            '';
            meta.mainProgram = "buildandconnect";
          };
          task =
            name: script:
            let
              wrapper = pkgs.writeShellApplication {
                name = "buildandconnect-${name}";
                runtimeInputs = [
                  node
                  pkgs.bun
                  pkgs.nixfmt
                  pkgs.shfmt
                ];
                text = ''
                  if [[ ! -f package.json || ! -f flake.nix ]]; then
                    echo "Run this command from the Build & Connect repository root." >&2
                    exit 1
                  fi
                  ${script}
                '';
              };
            in
            {
              type = "app";
              program = "${wrapper}/bin/buildandconnect-${name}";
              meta.description = "Run the Build & Connect ${name} task";
            };
        in
        {
          packages.default = web;
          apps = {
            default = {
              type = "app";
              program = "${web}/bin/buildandconnect";
              meta.description = "Preview the packaged Build & Connect Worker locally";
            };
            dev = task "dev" ''exec bun run dev "$@"'';
            build = task "build" ''exec bun run build "$@"'';
            test = task "test" ''exec bun run test "$@"'';
            typecheck = task "typecheck" ''exec bun run typecheck "$@"'';
            fmt = task "fmt" ''
              nixfmt flake.nix
              shfmt -w scripts/*.sh
              exec bun run fmt "$@"
            '';
            fmt-check = task "fmt-check" ''
              nixfmt --check flake.nix
              shfmt -d scripts/*.sh
              exec bun run fmt:check "$@"
            '';
            check = task "check" ''
              nixfmt --check flake.nix
              shfmt -d scripts/*.sh
              exec bun run check "$@"
            '';
            smoke = task "smoke" ''exec bun run smoke "$@"'';
          };
          devShells.default = pkgs.mkShell {
            packages = [
              node
              pkgs.bun
              pkgs.nixfmt
              pkgs.shfmt
              pkgs.jujutsu
              pkgs.direnv
            ];
            env.CLOUDFLARE_SEND_METRICS = "false";
          };
          formatter = pkgs.nixfmt;
          checks.default = web;
        };
    in
    {
      packages = forAllSystems (system: (perSystem system).packages);
      apps = forAllSystems (system: (perSystem system).apps);
      devShells = forAllSystems (system: (perSystem system).devShells);
      formatter = forAllSystems (system: (perSystem system).formatter);
      checks = forAllSystems (system: (perSystem system).checks);
    };
}
