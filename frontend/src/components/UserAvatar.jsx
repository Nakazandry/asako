import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

const initialsOf = (user) => `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'AS';

/**
 * Affiche la photo de profil de l'utilisateur connecte (endpoint /auth/me/photo),
 * avec repli sur ses initiales quand il n'en a pas.
 */
export default function UserAvatar({ user, size = 36, className = '', textClassName = '' }) {
  const [url, setUrl] = useState(null);
  const urlRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;

    api
      .get('/auth/me/photo', { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        const data = res.data;
        if (!data || data.type === 'application/json') {
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
          setUrl(null);
          return;
        }
        const next = URL.createObjectURL(data);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
      })
      .catch(() => {
        if (!active) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setUrl(null);
      });

    return () => {
      active = false;
    };
  }, [user?.id, user?.photo_type, user]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size }}
        className={`shrink-0 object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={`grid shrink-0 select-none place-items-center bg-gradient-to-br from-[#f8e1e5] to-[#eec4c9] font-black text-[#8f4a56] ${textClassName} ${className}`}
    >
      {initialsOf(user)}
    </span>
  );
}
