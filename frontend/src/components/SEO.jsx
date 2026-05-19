import React, { useEffect } from "react";

const SEO = ({ title, description, keywords }) => {
  useEffect(() => {
    // 1. Update Document Title
    const baseTitle = "eTPL - Thai PES League";
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;

    // 2. Update Meta Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);

      // Update OpenGraph & Twitter description for premium social sharing preview
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
      const twitterDesc = document.querySelector('meta[property="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute('content', description);
    }

    // 3. Update Search Keywords
    if (keywords) {
      let metaKey = document.querySelector('meta[name="keywords"]');
      if (!metaKey) {
        metaKey = document.createElement('meta');
        metaKey.setAttribute('name', 'keywords');
        document.head.appendChild(metaKey);
      }
      metaKey.setAttribute('content', keywords);
    }

    // 4. Update OpenGraph & Twitter Titles
    if (title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', `${title} | eTPL`);
      const twitterTitle = document.querySelector('meta[property="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', `${title} | eTPL`);
    }
  }, [title, description, keywords]);

  return null; // Non-visual SEO orchestration component
};

export default SEO;
