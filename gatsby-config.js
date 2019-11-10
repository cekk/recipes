module.exports = {
  plugins: [
    "gatsby-theme-material-ui",
    {
      resolve: `gatsby-transformer-json`,
      options: {
        typeName: `recipe`
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `./data/`
      }
    },
    "gatsby-transformer-sharp",
    "gatsby-plugin-sharp"
  ],

  siteMetadata: {
    title: "My page"
  }
};
