export function CommunityGarden() {
  return (
    <svg
      viewBox="0 0 1000 420"
      aria-hidden="true"
      focusable="false"
      className="block h-auto w-full overflow-visible text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <g id="garden-pine">
          <path d="M0 0 19 35H11L31 64H21L40 96H-40L-21 64H-31L-11 35H-19Z" />
          <path d="M0 72v38m-20-22 20 8 19-8m-31-26 12 7 12-7" fill="none" />
        </g>
        <pattern
          id="garden-hatching"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(25)"
        >
          <path d="M0 0V7" strokeWidth="0.7" opacity="0.25" />
        </pattern>
      </defs>

      <g className="fill-cloud" stroke="none">
        <path d="M0 334V177c15-24 38-26 55-10-9-43 40-64 65-34-1-50 63-63 82-20 42-21 80 17 63 51 45-5 66 39 40 65 49 3 68 40 56 69l84 36Z" />
        <path d="M1000 334V176c-23-26-55-20-67 7 1-52-56-69-82-32 5-55-63-72-86-24-37-23-80 14-62 49-45-6-73 40-44 69-43-4-72 40-53 65l-46 24Z" />
      </g>
      <g className="fill-map-land stroke-primary/25" opacity="0.65">
        <use href="#garden-pine" transform="translate(62 155) scale(1.45)" />
        <use href="#garden-pine" transform="translate(117 196) scale(1.1)" />
        <use href="#garden-pine" transform="translate(913 175) scale(1.3)" />
        <use href="#garden-pine" transform="translate(963 139) scale(1.65)" />
      </g>
      <path
        d="M0 316Q160 295 315 315T640 316 1000 314V345H0Z"
        className="fill-accent"
        stroke="none"
      />
      <path d="M0 334H1000V420H0Z" className="fill-map-water" stroke="none" />
      <path d="M0 334H1000" className="stroke-primary/50" />
      <g className="stroke-cloud/60" strokeWidth="1.5">
        <path d="M22 348h60m14 0h14m75 13h89m14 0h25m62-12h52m49 23h82m9 0h15m51-22h57m37 18h85m12 0h22m47-18h58" />
        <path d="M57 384h83m36 16h49m104-12h93m64 16h51m91-20h76m43 18h96m48-17h58m16 0h21" />
      </g>

      <ellipse
        cx="505"
        cy="290"
        rx="432"
        ry="43"
        className="fill-accent/70"
        stroke="none"
      />
      <circle
        cx="767"
        cy="107"
        r="52"
        className="fill-illustration-sun/60"
        stroke="none"
      />
      <path d="M90 295Q302 272 440 292T900 293" opacity="0.4" />
      <path
        d="M433 319Q498 277 558 242"
        strokeWidth="21"
        className="stroke-background"
      />
      <path
        d="m137 303 14-2m15 12 8-1m41-27 14-2m554 32 17-2m-69-4 8-1m55-11 14-2m-519 5 7-1"
        opacity="0.5"
      />

      <g>
        <path d="M177 282V105m0 126-38-38m38-3 33-41" strokeWidth="5" />
        <path
          d="M177 69c-30-18-55 8-49 30-40 9-39 45-18 58-20 28 0 58 32 54 13 25 54 24 66-3 39 6 58-30 37-53 19-28-5-58-30-57 2-23-17-36-38-29Z"
          className="fill-accent"
        />
        <path d="M177 262V108m0 99-31-30m31-8 25-28m-48-11 9 7m47 36 8-10" />
        <path
          d="M140 100c-8 8-8 18-6 22m83-9c14 8 18 17 16 25m-113 37c-1 11 7 20 17 21"
          opacity="0.5"
        />
        <path d="M173 280h-22m33 0h14" />
      </g>

      <g>
        <path d="M298 260V149l104-57 105 57v112" className="fill-card" />
        <path
          d="m278 156 124-69 124 68-11 16-113-62-112 63Z"
          className="fill-illustration-sun/70"
        />
        <path d="m288 160 114-63 116 63" />
        <path d="M298 218v43h210v-43" className="fill-secondary/60" />
        <path
          d="M321 193v-39h38v39Zm64-25v-34h35v34Zm56 25v-39h38v39Z"
          className="fill-accent"
        />
        <path d="M340 155v37m-17-18h35m44-38v31m-16-17h33m41 5v38m-17-19h35" />
        <path d="M383 261v-54a19 19 0 0 1 38 0v54" className="fill-primary" />
        <path d="M398 213v40m12-19v6" className="stroke-primary-foreground" />
        <path
          d="M294 262h219m-218 6h217M332 231h27m-27 7h18m94-7h32m-22 7h23"
          opacity="0.55"
        />
        <path d="M456 117V89h18v38" className="fill-secondary" />
        <path d="M452 90h26" />
        <path d="M461 73c-8-10 13-10 6-24" opacity="0.4" />
      </g>

      <g>
        <path d="M610 267V126h94v140" className="fill-accent/70" />
        <path d="M602 129q58-61 111 0" className="fill-secondary" />
        <path d="M603 132h109m-93 4v124m76-124v124" />
        <path
          d="M627 199c3-38 25-54 37-48 22 3 23 27 17 49"
          className="fill-card"
        />
        <path d="M657 200v-39m0 19-16-10m16 18 14-10" />
        <path d="M627 202h56l-7 19h-42Z" className="fill-illustration-sun" />
        <path d="M619 239h78m-70 9h63" />
      </g>

      <g>
        <path d="M839 286V136m0 90 35-30m-35 3-21-24" strokeWidth="4" />
        <path
          d="M838 123c-21-8-38 7-35 27-31 4-36 34-17 51-6 31 21 49 49 32 24 24 60 3 49-24 28-20 19-46-6-53 5-24-15-43-40-33Z"
          className="fill-primary"
        />
        <path
          d="M839 234v-83m0 50 22-24m-22 9-17-18"
          className="stroke-primary-foreground/60"
        />
        <path d="m834 289-11 1m26-2h17" />
        <path
          d="M809 286c-17-30-40-15-30 4m27-14c0-37-27-40-29-15m79 23c4-29 32-37 39-13m-26-3c-2-26 19-33 27-23"
          className="fill-accent"
        />
      </g>

      <g>
        <path d="m505 290 47-21 108 11-44 25Z" className="fill-secondary" />
        <path
          d="m505 290 2 15 109 17 44-27v-15m-44 25v17"
          className="fill-secondary"
        />
        <path d="m521 289 33-13 87 7-27 16Z" className="fill-primary/80" />
        <path
          d="M552 285v-21m0 9c-15 1-19-9-17-14 12-2 19 6 17 14Zm0-3c14-1 22-11 18-17-12 0-19 8-18 17Z"
          className="fill-accent"
        />
        <path
          d="M582 288v-27m0 10c-13 0-19-8-18-14 11-4 18 4 18 14Zm0-7c14 1 20-11 18-17-13-1-17 8-18 17Z"
          className="fill-accent"
        />
        <path
          d="M612 288v-19m0 5c-10-1-17-9-14-13 9-2 15 5 14 13Zm0 2c12 2 20-7 18-14-11-2-18 7-18 14Z"
          className="fill-accent"
        />
      </g>

      <g>
        <path d="M239 268h52m-46 0-3 30m42-30 4 28m-47-14h47" strokeWidth="3" />
        <path d="m245 268-5-24h33l6 24Z" className="fill-card" />
        <path d="m246 264-3-16h27l5 16" opacity="0.5" />
        <path
          d="M280 265h8v-11h-8Zm8-9c8-3 8 8 0 7"
          className="fill-illustration-sun"
        />
        <path
          d="M229 273v-38c-2-14-29-15-33 3l-1 38"
          className="fill-secondary"
        />
        <path d="m199 274-2 24h9l8-23 9 22h10l-7-26" className="fill-primary" />
        <path
          d="M205 230c-15-7-7-24 3-24s17 20 3 25"
          className="fill-secondary"
        />
        <path
          d="M197 216q-4-19 12-17c10 1 15 9 12 13l-18 1-2 9"
          className="fill-primary"
        />
        <path d="m220 237 11 21 15-2m-47-11 10 16 21 1" strokeWidth="5" />
        <path d="m190 277-4 23m8-43h-8v20h41" />
      </g>

      <g>
        <path
          d="M733 244c-12-1-18-18-7-23 18-7 24 18 7 23Z"
          className="fill-secondary"
        />
        <path
          d="M723 226q-4-14 9-14c9 0 12 8 10 17l-9-7-7 5"
          className="fill-primary"
        />
        <path
          d="m723 244-8 38 33 3-7-39"
          className="fill-illustration-flower"
        />
        <path
          d="m720 282-5 29h11l8-27m6 0 7 28h11l-10-27"
          className="fill-primary"
        />
        <path
          d="m719 249-11 15-14-13m46-1 11 14"
          strokeWidth="6"
          className="stroke-secondary"
        />
        <path d="m711 309 16 1m18 3h14" strokeWidth="4" />
        <path d="m695 260-11-9 7-8 10 8Z" className="fill-secondary" />
        <path d="m683 249-10-8m8 1-5-10" />
        <path d="m751 264 13 7 5-8-11-7Z" className="fill-illustration-sun" />
        <path d="m768 265 9-7-2-4-11 5m-5-2c-1-8 8-9 9-5" />
        <path d="m776 266 4 6m-1 4 2 5m-6-1 2 4" opacity="0.5" />
      </g>

      <g>
        <path d="M101 285v-24m0 13-13-9m13 3 10-10m-3 33v-10" />
        <path
          d="M95 245c-6-6-15 2-9 8-4 8 6 12 11 7 7 5 13-3 8-8 2-8-7-12-10-7Z"
          className="fill-illustration-flower"
        />
        <path
          d="M117 292v-18m0 10 11-5m-14-14c-7-7-13 3-7 6-2 8 10 7 10 2 8 3 11-7 4-9-1-7-11-5-7 1Z"
          className="fill-illustration-sun"
        />
        <path d="M916 294v-26m0 14-11-6m11-1 10-9" />
        <path
          d="M910 260c-8-10-18-2-12 5-2 9 9 12 13 5 6 8 16 0 11-6 3-8-9-13-12-4Z"
          className="fill-illustration-flower"
        />
      </g>
      <path
        d="m247 102 9-4 8 4m280-54 10-5 10 5m13 9 7-3 6 3m-69 43 7-3 7 3"
        opacity="0.5"
      />
      <path
        d="M323 257V222h53v35Zm107 0v-35h60v35Z"
        fill="url(#garden-hatching)"
        stroke="none"
      />
    </svg>
  );
}
