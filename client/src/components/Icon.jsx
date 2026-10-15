function Icon({ name }) {
  const shapes = {
    logo: (
      <>
        <path d="M4 16a8 8 0 0 1 16 0" />
        <path d="M2 20h20" />
      </>
    ),
    bell: (
      <>
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    check: <path d="m5 12 5 5 9-10" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    sidebar: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M10 5v14" />
      </>
    ),
    theme: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v16M12 8h6.9M12 12h8M12 16h6.9" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    'eye-off': (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
        <path d="M9.1 5.5A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-4.1 5.4" />
        <path d="M6.3 6.3A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.2-1.5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M3 19a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="9" r="3" />
        <path d="M6 19a6 6 0 0 1 12 0" />
      </>
    ),
    chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
    document: (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
        <path d="M14 3v6h6" />
      </>
    ),
    download: <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />,
    logout: <path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9" />,
    left: <path d="m14 6-6 6 6 6" />,
    right: <path d="m10 6 6 6-6 6" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5M12 16h.01" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  }

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {shapes[name]}
    </svg>
  )
}

export default Icon
