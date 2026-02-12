import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CreatorLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      localStorage.setItem('ref_creator_slug', slug);
    }
    navigate('/', { replace: true });
  }, [slug, navigate]);

  return null;
}
