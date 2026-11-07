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
                "lib"
                "backend"
                "migrations"
                "tests"
                "scripts"
                "package.json"
                "package-lock.json"
                "tsconfig.json"
                "vite.config.ts"
                "cloudflare.config.ts"
                "next.config.ts"
                "postcss.config.mjs"
                ".prettierrc.json"
                ".prettierignore"
              ];
          };
          web = pkgs.buildNpmPackage {
            pname = "buildandconnect";
            version = "0.1.0";
            src = source;
            nodejs = node;
            npmDepsHash = "sha256-5df7l3v5zXIDZ3v59EoTfy1iqSMLzb1kJq8uyy6EHvY=";
            SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
            nativeBuildInputs = [
              pkgs.makeWrapper
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ pkgs.autoPatchelfHook ];
            buildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ pkgs.stdenv.cc.cc.lib ];
            postConfigure = pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
              autoPatchelf node_modules
            '';
            postInstall = pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
              autoPatchelf "$out"
            '';
            preBuild = ''
              export HOME="$TMPDIR/home"
              mkdir -p "$HOME"
              export CI=true
              export CLOUDFLARE_SEND_METRICS=false
            '';
            doCheck = true;
            checkPhase = ''
              runHook preCheck
              npm run typecheck
              npm test
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
            dev = task "dev" ''exec npm run dev -- "$@"'';
            build = task "build" ''exec npm run build -- "$@"'';
            test = task "test" ''exec npm test -- "$@"'';
            typecheck = task "typecheck" ''exec npm run typecheck -- "$@"'';
            fmt = task "fmt" ''
              nixfmt flake.nix
              shfmt -w scripts/*.sh
              exec npm run fmt -- "$@"
            '';
            fmt-check = task "fmt-check" ''
              nixfmt --check flake.nix
              shfmt -d scripts/*.sh
              exec npm run fmt:check -- "$@"
            '';
            check = task "check" ''
              nixfmt --check flake.nix
              shfmt -d scripts/*.sh
              exec npm run check -- "$@"
            '';
            smoke = task "smoke" ''exec npm run smoke -- "$@"'';
          };
          devShells.default = pkgs.mkShell {
            packages = [
              node
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
