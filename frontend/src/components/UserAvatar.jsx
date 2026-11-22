import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

const initialsOf = (user) => `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'AS';
const photoRequests = new Map();

const loadProfilePhoto = (userId, revision) => {
  const cached = photoRequests.get(userId);
  if (cached?.revision === revision) return cached.promise;

  const promise = api
    .get('/auth/me/photo', { responseType: 'blob' })
    .then(({ data, status }) => (status === 204 || !data?.size ? null : data));
  photoRequests.set(userId, { revision, promise });
  return promise;
};

/**
 * Affiche la photo de profil de l'utilisateur connecte (endpoint /auth/me/photo),
 * avec repli sur ses initiales quand il n'en a pas.
 */
export default function UserAvatar({ user, size = 36, className = '', textClassName = '' }) {
  const { photoRevision } = useAuth();
  const [url, setUrl] = useState(null);
  const urlRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!user?.id || !user?.photo_type) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setUrl(null);
      return undefined;
    }

    loadProfilePhoto(user.id, photoRevision)
      .then((data) => {
        if (!active) return;
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
  }, [user?.id, user?.photo_type, photoRevision]);

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
      className={`grid shrink-0 select-none place-items-center bg-gradient-to-br from-[#e6f3e9] to-[#b7dec2] font-black text-[#147a54] ${textClassName} ${className}`}
    >
      {initialsOf(user)}
    </span>
  );
}
