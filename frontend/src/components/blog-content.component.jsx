

const Quote = ({quote , caption}) => {
    return (
        <div className='bg-purple/10 p-3 pl-5 border-l-4 border-purple'>
            <p className='text-xl leading-10 md:text-2xl'> {quote} </p>
            {
                caption.length ? <p className='w-full text-purple text-base'>
                    {caption}
                </p> : ""
            }
        </div>
    )
}

const List = ({style, items}) =>{
    return (
             <ol className={` pl-5 ${ style == "ordered" ? "list-decimal" : "list-disc"} `}>

                {
                    items.map((item, i) =>{
                        return <li key={i} className="my-4 " dangerouslySetInnerHTML={{__html: item}}></li>
                    })
                }

             </ol>
    )
}

const BlogContent = ( { block }) => {

    let { type, data} = block;

    if(type == "paragraph"){
        return <p dangerouslySetInnerHTML={{ __html: data.text }}></p>
    }
    if(type == "header"){
        if(data.level == 1){
            return <h1
            className='text-5xl font-bold'
            dangerouslySetInnerHTML={{ __html: data.text }}
            ></h1>
        }
        if(data.level == 3){
            return <h3
            className='text-3xl font-bold'
            dangerouslySetInnerHTML={{ __html: data.text }}
            ></h3>
        }
        if(data.level == 2){
            return <h2
            className='text-4xl font-bold'
            dangerouslySetInnerHTML={{ __html: data.text }}
            ></h2>
        }
        if(data.level == 4){
            return <h4
            className=' font-bold'
            dangerouslySetInnerHTML={{ __html: data.text }}
            ></h4>
        }
        if(data.level == 5){
            return <h5
            className=' font-bold'
            dangerouslySetInnerHTML={{ __html: data.text }}
            ></h5>
        }
        if(data.level == 6){
            return <h6
            className=' font-bold'
            dangerouslySetInnerHTML={{ __html: data.text }}
            ></h6>
        }   
    }
    if(type == "quote"){
        return <Quote quote={data.text} caption={data.caption} />
    }
    if(type == "list"){
        return <List style={data.style} items={data.items} />
    }
    else{
        return <h1> this is a block</h1>
    }

  
}

export default BlogContent
