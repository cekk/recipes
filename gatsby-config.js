module.exports = {
  plugins: [
    "gatsby-theme-material-ui",
    // {
    //   resolve: `gatsby-transformer-json`,
    //   options: {
    //     typeName: `recipe`
    //   }
    // },
    {
      resolve: `gatsby-transformer-yaml`,
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
  pathPrefix: "/recipes",
  siteMetadata: {
    title: "My page"
  }
};
