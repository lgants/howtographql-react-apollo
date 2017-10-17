import React, { Component } from 'react'
import { graphql, gql } from 'react-apollo'
import Link from './Link'

class LinkList extends Component {

  render() {
    if (this.props.allLinksQuery && this.props.allLinksQuery.loading) {
      return (<div>Loading</div>)
    }

    if (this.props.allLinksQuery && this.props.allLinksQuery.error) {
      return (<div>Error</div>)
    }

    const linksToRender = this.props.allLinksQuery.allLinks

    return (
      <div>
        {linksToRender.map(link => (
          <Link key={link.id} link={link}/>
        ))}
      </div>
    )
  }
}

// NOTE uses query method on ApolloClient to sends query to server; imperative way of fetching data that enables processing the response as a promise
// client.query({
//   query: gql`
//     query AllLinks {
//       allLinks {
//         id
//       }
//     }
//   `
// }).then(response => console.log(response.data.allLinks))

// gql function is used to parse the plain GraphQL code
// AllLinksQuery is the operation name
const ALL_LINKS_QUERY = gql`
  # 2
  query AllLinksQuery {
    allLinks {
      id
      createdAt
      url
      description
    }
  }
`

// name option specifies the name of the prop that Apollo injects into the LinkList component; defaults to data
export default graphql(ALL_LINKS_QUERY, { name: 'allLinksQuery' }) (LinkList)
